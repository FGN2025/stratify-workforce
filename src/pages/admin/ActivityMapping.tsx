import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Check, Link2Off, Layers } from 'lucide-react';

type Status =
  | 'MATCHED'
  | 'ACCEPTED_MULTI_INTERPRETATION'
  | 'ACADEMY_NATIVE'
  | 'NEEDS_REVIEW'
  | 'LEGACY_SOURCE'
  | 'ORPHANED_SOURCE'
  | 'RETIRED';

const STATUS_ORDER: Status[] = [
  'NEEDS_REVIEW',
  'MATCHED',
  'ACCEPTED_MULTI_INTERPRETATION',
  'ACADEMY_NATIVE',
  'LEGACY_SOURCE',
  'ORPHANED_SOURCE',
  'RETIRED',
];

const STATUS_STYLE: Record<Status, string> = {
  MATCHED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ACCEPTED_MULTI_INTERPRETATION: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  ACADEMY_NATIVE: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  NEEDS_REVIEW: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LEGACY_SOURCE: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  ORPHANED_SOURCE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  RETIRED: 'bg-muted text-muted-foreground border-border',
};

const STATUS_HELP: Record<Status, string> = {
  MATCHED: 'A single FGN.GG canonical activity resolves deterministically from recorded source identifiers.',
  ACCEPTED_MULTI_INTERPRETATION: 'Several work orders share one canonical activity because they are materially different educational interpretations of the same simulated activity. This is a valid resolved state and is not surfaced for review again.',
  ACADEMY_NATIVE: 'Academy-authored work order with no game challenge behind it. This is a valid resolved state.',
  NEEDS_REVIEW: 'Identity cannot be resolved without a human decision.',
  LEGACY_SOURCE: 'Carries an Academy-side source identifier only, with no recorded FGN.GG lineage.',
  ORPHANED_SOURCE: 'Recorded FGN.GG provenance, but no matching challenge in the live catalog.',
  RETIRED: 'Out of active use. Lifecycle state, not an identity failure.',
};

interface Row {
  work_order_id: string;
  proposed_simulation_activity_id: string | null;
  matched_challenge_id: string | null;
  match_basis: string | null;
  is_deterministic: boolean;
  status: Status;
  resolved: boolean;
  approved_at: string | null;
  last_run_at: string;
  diagnostics: Record<string, unknown>;
}

interface CacheRow {
  simulation_activity_id: string;
  canonical_name: string | null;
  gg_game_name: string | null;
  game_version: string | null;
  activity_category: string | null;
  industry_domain: string | null;
}

export default function ActivityMapping() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'ALL' | Status>('NEEDS_REVIEW');
  const [search, setSearch] = useState('');
  const token = session?.access_token;

  const { data: rows, isLoading } = useQuery({
    queryKey: ['activity-mapping', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulation_activity_reconciliation')
        .select('*')
        .order('status', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ['activity-cache', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulation_activity_cache')
        .select('simulation_activity_id, canonical_name, gg_game_name, game_version, activity_category, industry_domain');
      if (error) throw error;
      return (data ?? []) as unknown as CacheRow[];
    },
  });

  const activityById = new Map((activities ?? []).map((a) => [a.simulation_activity_id, a]));

  const runReconcile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reconcile-simulation-activities', {
        body: { action: 'run' },
      });
      if (error) throw error;
      return data as { work_orders_examined?: number; status_counts?: Record<string, number> };
    },
    onSuccess: (data) => {
      toast.success(`Reconciled ${data?.work_orders_examined ?? 0} work orders — proposals only, nothing was changed.`);
      queryClient.invalidateQueries({ queryKey: ['activity-mapping'] });
      queryClient.invalidateQueries({ queryKey: ['activity-cache'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (vars: { workOrderId: string; activityId: string | null }) => {
      const { data, error } = await supabase.functions.invoke('reconcile-simulation-activities', {
        body: {
          action: 'approve',
          work_order_id: vars.workOrderId,
          simulation_activity_id: vars.activityId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Applied to the work order.');
      queryClient.invalidateQueries({ queryKey: ['activity-mapping'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptMulti = useMutation({
    mutationFn: async (vars: { workOrderIds: string[]; activityId: string }) => {
      const { data, error } = await supabase.functions.invoke('reconcile-simulation-activities', {
        body: {
          action: 'accept_multi_interpretation',
          work_order_ids: vars.workOrderIds,
          simulation_activity_id: vars.activityId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Accepted as multiple interpretations of one activity.');
      queryClient.invalidateQueries({ queryKey: ['activity-mapping'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { workOrderId: string; status: Status }) => {
      const { data, error } = await supabase.functions.invoke('reconcile-simulation-activities', {
        body: { action: 'set_status', work_order_id: vars.workOrderId, status: vars.status },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Status recorded.');
      queryClient.invalidateQueries({ queryKey: ['activity-mapping'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (rows ?? []).filter((r) => r.status === s).length;
    return acc;
  }, {});

  // One canonical activity may legitimately support several work orders, each a
  // different educational or industry interpretation. Group them so they can be
  // reviewed together rather than flagged as errors one by one.
  const sharedGroups = Object.values(
    (rows ?? []).reduce<Record<string, Row[]>>((acc, r) => {
      const key = r.proposed_simulation_activity_id;
      if (!key) return acc;
      (acc[key] ||= []).push(r);
      return acc;
    }, {}),
  ).filter((group) => group.length > 1);

  const visible = (rows ?? [])
    .filter((r) => (tab === 'ALL' ? true : r.status === tab))
    // ACADEMY NATIVE is resolved — never nag about it in the review queue.
    .filter((r) => !(tab === 'NEEDS_REVIEW' && r.resolved))
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const d = r.diagnostics ?? {};
      return (
        String(d.title ?? '').toLowerCase().includes(q) ||
        String(d.game_title ?? '').toLowerCase().includes(q) ||
        String(r.matched_challenge_id ?? '').toLowerCase().includes(q) ||
        String(r.proposed_simulation_activity_id ?? '').toLowerCase().includes(q)
      );
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Activity Mapping Console</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">
              Canonical activity identity is published by FGN.GG. This console proposes mappings from
              recorded source identifiers only — never from titles or guesswork — and changes a work order
              only when you approve it.
            </p>
          </div>
          <Button onClick={() => runReconcile.mutate()} disabled={runReconcile.isPending}>
            {runReconcile.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <RefreshCw className="h-4 w-4 mr-2" />}
            Run reconciliation
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'ALL' | Status)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ALL">All ({rows?.length ?? 0})</TabsTrigger>
            {STATUS_ORDER.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s.replace('_', ' ')} ({counts[s] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tab !== 'ALL' && (
          <p className="text-sm text-muted-foreground">{STATUS_HELP[tab]}</p>
        )}

        <Input
          placeholder="Search by work order title, game, challenge id or activity id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xl"
        />

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading mappings…
          </div>
        ) : visible.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            Nothing here. Run a reconciliation to refresh proposals.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => {
              const d = (r.diagnostics ?? {}) as Record<string, unknown>;
              const activity = r.proposed_simulation_activity_id
                ? activityById.get(r.proposed_simulation_activity_id)
                : undefined;
              const current = (d.current_simulation_activity_id as string | null) ?? null;
              const alreadyApplied = !!current && current === r.proposed_simulation_activity_id;
              return (
                <Card key={r.work_order_id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <CardTitle className="text-base font-semibold">
                        {String(d.title ?? 'Untitled work order')}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {d.duplicate_canonical_mapping ? (
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400">
                            Duplicate claim
                          </Badge>
                        ) : null}
                        {d.identity_conflict ? (
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400">
                            Identity conflict
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className={STATUS_STYLE[r.status]}>
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Game" value={String(d.game_title ?? '—')} />
                      <Field label="Match basis" value={r.match_basis ?? 'none'} />
                      <Field label="GG challenge" value={r.matched_challenge_id ?? '—'} mono />
                      <Field
                        label="Canonical activity"
                        value={activity?.canonical_name ?? (r.proposed_simulation_activity_id ?? 'none published')}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Academy source id" value={String(d.source_challenge_id ?? '—')} mono />
                      <Field label="GG origin id" value={String(d.fgn_origin_challenge_id ?? '—')} mono />
                      <Field label="Recorded on work order" value={current ?? 'not set'} mono />
                      <Field
                        label="Industry / category"
                        value={activity ? `${activity.industry_domain ?? '—'} / ${activity.activity_category ?? '—'}` : '—'}
                      />
                    </div>

                    {d.review_reason ? (
                      <p className="text-xs text-muted-foreground">
                        Reason: {String(d.review_reason).replace(/_/g, ' ')}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={!r.proposed_simulation_activity_id || alreadyApplied || approve.isPending}
                        onClick={() => approve.mutate({
                          workOrderId: r.work_order_id,
                          activityId: r.proposed_simulation_activity_id,
                        })}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {alreadyApplied ? 'Already applied' : 'Approve canonical identity'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ workOrderId: r.work_order_id, status: 'ACADEMY_NATIVE' })}
                      >
                        <Link2Off className="h-3.5 w-3.5 mr-1.5" />
                        Mark Academy native
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ workOrderId: r.work_order_id, status: 'RETIRED' })}
                      >
                        Mark retired
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? 'font-mono text-xs break-all' : 'text-sm'}>{value}</div>
    </div>
  );
}
