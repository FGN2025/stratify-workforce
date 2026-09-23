import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

/** One row of the readiness view — computed indicators plus recorded approvals. */
interface ReadinessRow {
  work_order_id: string;
  title: string;
  game_title: string | null;
  simulation_activity_id: string | null;
  canonical_name: string | null;
  industry_domain: string;
  is_active: boolean;
  canonical_activity_linked: boolean;
  academy_native: boolean;
  task_count: number | null;
  mapping_count: number | null;
  approved_mapping_count: number | null;
  tasks_with_mappings: number | null;
  mappings_with_direct_bases: number | null;
  requirement_count: number | null;
  criteria_count: number | null;
  gating_criteria_count: number | null;
  approved_level: number;
  level1_eligible: boolean;
  level2_eligible: boolean;
  level3_eligible: boolean;
}

const LEVEL_LABEL: Record<number, string> = {
  0: 'Not started',
  1: 'Level 1 — canonically connected',
  2: 'Level 2 — skills mapped',
  3: 'Level 3 — evidence validated',
};

function reasons(r: ReadinessRow, level: 1 | 2 | 3): string {
  if (level === 1) {
    return r.canonical_activity_linked
      ? 'Canonical activity linked.'
      : r.academy_native
        ? 'Academy-authored with no game challenge behind it — no canonical activity applies.'
        : 'No canonical activity recorded yet.';
  }
  if (level === 2) {
    const missing: string[] = [];
    if (!r.canonical_activity_linked) missing.push('canonical activity not linked');
    if (!r.task_count) missing.push('no tasks authored');
    if ((r.tasks_with_mappings ?? 0) < (r.task_count ?? 0)) missing.push('not every task has a skill mapping');
    if (!r.approved_mapping_count) missing.push('no approved skill mappings');
    return missing.length ? `Blocked: ${missing.join('; ')}.` : 'Every task carries an approved canonical skill mapping.';
  }
  const missing: string[] = [];
  if (!r.requirement_count) missing.push('no task-level evidence requirements');
  if (!r.gating_criteria_count) missing.push('no must-pass assessment criteria');
  if ((r.mappings_with_direct_bases ?? 0) < (r.mapping_count ?? 0)) missing.push('direct evidence bases not authored on every mapping');
  if (!r.approved_mapping_count) missing.push('no approved skill mappings');
  return missing.length ? `Blocked: ${missing.join('; ')}.` : 'Evidence requirements, criteria and evidence bases are all authored.';
}

export function MigrationMaturityPanel() {
  const { session } = useAuth();
  const token = session?.access_token;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: rows, isLoading } = useQuery({
    queryKey: ['migration-readiness', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_migration_readiness' as never)
        .select('*');
      if (error) throw error;
      return (data ?? []) as unknown as ReadinessRow[];
    },
  });

  const promote = useMutation({
    mutationFn: async (vars: { workOrderId: string; level: 1 | 2 | 3 }) => {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { work_order_id: vars.workOrderId };
      if (vars.level >= 1) patch.level1_approved_at = now;
      if (vars.level >= 2) patch.level2_approved_at = now;
      if (vars.level >= 3) patch.level3_approved_at = now;
      const { error } = await supabase
        .from('work_order_migration_maturity' as never)
        .upsert(patch as never, { onConflict: 'work_order_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Maturity level recorded.');
      queryClient.invalidateQueries({ queryKey: ['migration-readiness'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rollup = useMemo(() => {
    const byDomain: Record<string, {
      domain: string; total: number; l1: number; l2: number; l3: number;
      unmapped: number; native: number; taxonomyGaps: number; evidenceGaps: number;
    }> = {};
    for (const r of rows ?? []) {
      const key = r.industry_domain || 'unclassified';
      const d = (byDomain[key] ||= {
        domain: key, total: 0, l1: 0, l2: 0, l3: 0, unmapped: 0, native: 0, taxonomyGaps: 0, evidenceGaps: 0,
      });
      d.total += 1;
      if (r.approved_level >= 1) d.l1 += 1;
      if (r.approved_level >= 2) d.l2 += 1;
      if (r.approved_level >= 3) d.l3 += 1;
      if (!r.canonical_activity_linked && !r.academy_native) d.unmapped += 1;
      if (r.academy_native) d.native += 1;
      if ((r.task_count ?? 0) > 0 && (r.tasks_with_mappings ?? 0) < (r.task_count ?? 0)) d.taxonomyGaps += 1;
      if ((r.task_count ?? 0) > 0 && !r.requirement_count) d.evidenceGaps += 1;
    }
    return Object.values(byDomain).sort((a, b) => b.total - a.total);
  }, [rows]);

  const conflicts = useMemo(() => {
    const byActivity: Record<string, ReadinessRow[]> = {};
    for (const r of rows ?? []) {
      if (!r.simulation_activity_id) continue;
      (byActivity[r.simulation_activity_id] ||= []).push(r);
    }
    return Object.values(byActivity).filter((g) => g.length > 1);
  }, [rows]);

  const visible = (rows ?? [])
    .filter((r) => !search.trim() || `${r.title} ${r.game_title} ${r.industry_domain}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.approved_level - a.approved_level || a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Industry rollout</CardTitle>
          <p className="text-sm text-muted-foreground">
            Control surface for staged migration. Levels are counted from recorded administrative
            approvals, never from the presence of fields alone.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="py-2 pr-4">Industry</th>
                <th className="py-2 pr-4">Assignments</th>
                <th className="py-2 pr-4">Level 1</th>
                <th className="py-2 pr-4">Level 2</th>
                <th className="py-2 pr-4">Level 3</th>
                <th className="py-2 pr-4">No activity</th>
                <th className="py-2 pr-4">Academy native</th>
                <th className="py-2 pr-4">Skill gaps</th>
                <th className="py-2 pr-4">Evidence gaps</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map((d) => (
                <tr key={d.domain} className="border-t border-border/50">
                  <td className="py-2 pr-4 font-medium">{d.domain.replace(/_/g, ' ')}</td>
                  <td className="py-2 pr-4">{d.total}</td>
                  <td className="py-2 pr-4">{d.l1}</td>
                  <td className="py-2 pr-4">{d.l2}</td>
                  <td className="py-2 pr-4">{d.l3}</td>
                  <td className="py-2 pr-4">{d.unmapped}</td>
                  <td className="py-2 pr-4">{d.native}</td>
                  <td className="py-2 pr-4">{d.taxonomyGaps}</td>
                  <td className="py-2 pr-4">{d.evidenceGaps}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {conflicts.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {conflicts.length} canonical {conflicts.length === 1 ? 'activity supports' : 'activities support'} more
              than one assignment. That is valid where the interpretations genuinely differ — review them in the
              shared-activity section above.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Migration maturity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Levels 1 and 2 say nothing about whether a learner has demonstrated anything. Only Level 3
            assignments can produce skill evidence, and promotion is always a deliberate approval.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search assignments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            visible.map((r) => (
              <div key={r.work_order_id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.canonical_name ?? 'No canonical activity'} · {r.industry_domain.replace(/_/g, ' ')} · {r.game_title ?? '—'}
                    </div>
                  </div>
                  <Badge variant="outline" className={r.approved_level === 3
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : r.approved_level > 0
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-border text-muted-foreground'}>
                    {LEVEL_LABEL[r.approved_level]}
                  </Badge>
                </div>

                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li><strong className="text-foreground">Level 1:</strong> {reasons(r, 1)}</li>
                  <li><strong className="text-foreground">Level 2:</strong> {reasons(r, 2)}</li>
                  <li><strong className="text-foreground">Level 3:</strong> {reasons(r, 3)}</li>
                  <li>
                    {r.task_count ?? 0} tasks · {r.approved_mapping_count ?? 0} approved skill mappings ·{' '}
                    {r.requirement_count ?? 0} evidence requirements · {r.criteria_count ?? 0} criteria
                    ({r.gating_criteria_count ?? 0} must pass)
                  </li>
                </ul>

                <div className="flex flex-wrap gap-2">
                  {([1, 2, 3] as const).map((lvl) => {
                    const eligible = lvl === 1 ? r.level1_eligible : lvl === 2 ? r.level2_eligible : r.level3_eligible;
                    return (
                      <Button
                        key={lvl}
                        size="sm"
                        variant={r.approved_level >= lvl ? 'outline' : 'default'}
                        disabled={!eligible || r.approved_level >= lvl || promote.isPending}
                        onClick={() => promote.mutate({ workOrderId: r.work_order_id, level: lvl })}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                        {r.approved_level >= lvl ? `Level ${lvl} approved` : `Approve Level ${lvl}`}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
