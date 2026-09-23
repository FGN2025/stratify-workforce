import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink } from 'lucide-react';

type StructuredField = {
  key: string;
  label: string;
  unit?: string;
  order?: number;
  reviewer_guidance?: string;
};

type Pending = {
  assoc_id: string;
  user_id: string;
  association_status: string;
  learner_rationale: string | null;
  timecode_start_seconds: number | null;
  timecode_end_seconds: number | null;
  created_at: string;
  learner: string;
  tenant: string | null;
  work_order: string;
  task_id: string;
  task_title: string;
  completion_id: string;
  demonstration_id: string | null;
  requirement_id: string;
  requirement_label: string;
  artifact_title: string | null;
  artifact_kind: string;
  storage_path: string | null;
  body_text: string | null;
  body_structured: Record<string, unknown> | null;
  response_schema: { fields?: StructuredField[] } | null;
};

function mmss(s?: number | null) {
  if (s == null) return null;
  return `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}`;
}

function usePendingTaskEvidence() {
  return useQuery({
    queryKey: ['pending-task-evidence'],
    queryFn: async (): Promise<Pending[]> => {
      const { data: assocs, error } = await supabase
        .from('evidence_artifact_requirements')
        .select('*')
        .eq('is_active', true)
        .in('association_status', ['claimed', 'under_review'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!assocs?.length) return [];

      const [{ data: artifacts }, { data: reqs }, { data: profiles }, { data: tenants }, { data: demos }] =
        await Promise.all([
          supabase.from('evidence_artifacts').select('*').in('id', assocs.map((a) => a.artifact_id)),
          supabase
            .from('work_order_task_evidence_requirements')
            .select('id, label, task_id, response_schema')
            .in('id', assocs.map((a) => a.requirement_id)),
          supabase.rpc('get_public_profile_data', { profile_ids: assocs.map((a) => a.user_id) }),
          supabase.from('tenants').select('id, name'),
          supabase
            .from('task_demonstrations')
            .select('id, task_id, completion_id')
            .in('completion_id', assocs.map((a) => a.completion_id).filter(Boolean) as string[]),
        ]);

      const taskIds = [...new Set((reqs ?? []).map((r) => r.task_id))];
      const { data: tasks } = await supabase
        .from('work_order_tasks')
        .select('id, title, work_order_id')
        .in('id', taskIds);
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('id, title, generated_name')
        .in('id', [...new Set((tasks ?? []).map((t) => t.work_order_id))]);

      return assocs.map((a) => {
        const req = reqs?.find((r) => r.id === a.requirement_id);
        const task = tasks?.find((t) => t.id === req?.task_id);
        const wo = workOrders?.find((w) => w.id === task?.work_order_id);
        const artifact = artifacts?.find((x) => x.id === a.artifact_id);
        const demo = demos?.find((d) => d.task_id === req?.task_id && d.completion_id === a.completion_id);
        return {
          assoc_id: a.id,
          user_id: a.user_id,
          association_status: a.association_status,
          learner_rationale: a.learner_rationale,
          timecode_start_seconds: a.timecode_start_seconds,
          timecode_end_seconds: a.timecode_end_seconds,
          created_at: a.created_at,
          learner: profiles?.find((p: { id: string }) => p.id === a.user_id)?.username ?? 'Learner',
          tenant: tenants?.find((t) => t.id === a.tenant_id)?.name ?? null,
          work_order: wo?.generated_name || wo?.title || 'Work order',
          task_id: req?.task_id ?? '',
          task_title: task?.title ?? 'Step',
          completion_id: a.completion_id ?? '',
          demonstration_id: demo?.id ?? null,
          requirement_id: a.requirement_id,
          requirement_label: req?.label ?? 'Requirement',
          artifact_title: artifact?.title ?? null,
          artifact_kind: artifact?.artifact_kind ?? 'file',
          storage_path: artifact?.storage_path ?? null,
          body_text: artifact?.body_text ?? null,
          body_structured: (artifact?.body_structured as Record<string, unknown> | null) ?? null,
          response_schema: (req?.response_schema as { fields?: StructuredField[] } | null) ?? null,
        };
      });
    },
  });
}

function ReviewRow({ item, onDone }: { item: Pending; onDone: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [quality, setQuality] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  const { data: criteria = [] } = useQuery({
    queryKey: ['assessment-criteria', item.requirement_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_criteria')
        .select('*')
        .eq('requirement_id', item.requirement_id)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Earlier submissions by the same learner against this same requirement, with how they were assessed. */
  const { data: priorRounds = [] } = useQuery({
    queryKey: ['prior-evidence-rounds', item.requirement_id, item.user_id, item.completion_id],
    queryFn: async () => {
      const { data: prior, error } = await supabase
        .from('evidence_artifact_requirements')
        .select('*')
        .eq('requirement_id', item.requirement_id)
        .eq('user_id', item.user_id)
        .eq('completion_id', item.completion_id)
        .neq('id', item.assoc_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!prior?.length) return [];
      const { data: results } = await supabase
        .from('assessment_results')
        .select('*')
        .in('artifact_requirement_id', prior.map((p) => p.id));
      const { data: artifacts } = await supabase
        .from('evidence_artifacts')
        .select('id, title')
        .in('id', prior.map((p) => p.artifact_id));
      return prior.map((p) => ({
        ...p,
        artifact_title: artifacts?.find((a) => a.id === p.artifact_id)?.title ?? 'Evidence',
        results: (results ?? []).filter((r) => r.artifact_requirement_id === p.id),
      }));
    },
  });


  const openFile = async () => {
    if (!item.storage_path) return;
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(item.storage_path, 300);
    if (error) {
      toast({ title: 'Could not open file', description: error.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const unassessed = criteria.filter((c) => !outcomes[c.id] || !quality[c.id]);
  const gatingBlocked = criteria.some(
    (c) => c.is_gating && outcomes[c.id] && outcomes[c.id] !== 'met'
  );

  const decide = useMutation({
    mutationFn: async (decision: 'accepted' | 'needs_revision' | 'rejected') => {
      if (!user) throw new Error('Not signed in');
      if (unassessed.length) {
        throw new Error('Assess every point explicitly before recording a decision.');
      }
      const rows = criteria.map((c) => ({
        artifact_requirement_id: item.assoc_id,
        criterion_id: c.id,
        outcome: outcomes[c.id] as 'met' | 'partially_met' | 'not_met' | 'not_observed',
        evidence_quality: quality[c.id] as 'insufficient' | 'adequate' | 'strong',
        reviewer_id: user.id,
        reviewer_note: note || null,
      }));
      if (rows.length) {
        const { error } = await supabase
          .from('assessment_results')
          .upsert(rows, { onConflict: 'artifact_requirement_id,criterion_id,reviewer_id' });
        if (error) throw error;
      }
      const { error: uErr } = await supabase
        .from('evidence_artifact_requirements')
        .update({
          association_status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_note: note || null,
        })
        .eq('id', item.assoc_id);
      if (uErr) throw uErr;

      if (item.demonstration_id) {
        const { error: rErr } = await supabase.rpc('complete_task_review', {
          p_demonstration_id: item.demonstration_id,
        });
        if (rErr) throw rErr;
      }
    },
    onSuccess: () => {
      toast({ title: 'Review recorded' });
      onDone();
    },
    onError: (e) => toast({ title: 'Review failed', description: (e as Error).message, variant: 'destructive' }),
  });

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p className="font-semibold">
            {item.learner} — {item.work_order}
          </p>
          <p className="text-sm text-muted-foreground">
            {item.task_title} · {item.requirement_label}
            {item.tenant && ` · ${item.tenant}`}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {item.association_status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="rounded-md bg-muted/30 p-3 text-sm space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">{item.artifact_title ?? 'Evidence'}</span>
          {item.timecode_start_seconds != null && (
            <span className="text-muted-foreground">
              {mmss(item.timecode_start_seconds)}–{mmss(item.timecode_end_seconds)}
            </span>
          )}
          {item.storage_path && (
            <Button size="sm" variant="outline" onClick={openFile}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open file
            </Button>
          )}
        </div>
        {item.body_structured && (
          <div className="rounded border border-border/60 divide-y divide-border/60">
            {structuredRows.map((row) => (
              <div key={row.key} className="flex flex-wrap justify-between gap-2 px-2 py-1.5">
                <span className="text-muted-foreground">
                  {row.label}
                  {row.guidance && <span className="block text-xs">{row.guidance}</span>}
                </span>
                <span className="font-medium">
                  {row.value}
                  {row.unit ? ` ${row.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        {item.body_text && <p className="whitespace-pre-wrap">{item.body_text}</p>}
        {item.learner_rationale && (
          <p className="text-muted-foreground">Learner note: {item.learner_rationale}</p>
        )}
      </div>

      {priorRounds.length > 0 && (
        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <p className="text-sm font-medium">Earlier submissions for this point</p>
          {priorRounds.map((p) => (
            <div key={p.id} className="text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {p.association_status.replace(/_/g, ' ')}
                </Badge>
                <span className="font-medium">{p.artifact_title}</span>
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
              {p.reviewer_note && <p className="text-muted-foreground">Reviewer said: {p.reviewer_note}</p>}
              {p.results.map((r) => (
                <p key={r.id} className="text-muted-foreground">
                  • {criteria.find((c) => c.id === r.criterion_id)?.criterion_text ?? 'Point'} —{' '}
                  {OUTCOME_LABEL[r.outcome as string] ?? r.outcome} ({r.evidence_quality})
                </p>
              ))}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            These stay in history. Assess the new evidence on its own — focus on the points that were previously
            not met or not shown.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {(['gating', 'other'] as const).map((group) => {
          const rows = group === 'gating' ? gatingCriteria : otherCriteria;
          if (!rows.length) return null;
          return (
            <div key={group} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group === 'gating' ? 'Must be met to accept' : 'Additional points'}
              </p>
              {rows.map((c) => {
          const previous = priorRounds
            .flatMap((p) => p.results)
            .filter((r) => r.criterion_id === c.id)
            .slice(-1)[0];
          return (
          <div key={c.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <p className="text-sm">
                {c.criterion_text}
                {c.is_gating && <Badge className="ml-2 bg-primary/15 text-primary">required</Badge>}
              </p>
              {c.guidance_for_reviewer && (
                <p className="text-xs text-muted-foreground">{c.guidance_for_reviewer}</p>
              )}
              {previous && (
                <p className="text-xs text-muted-foreground">
                  Previously: {OUTCOME_LABEL[previous.outcome as string] ?? previous.outcome}
                </p>
              )}
            </div>
            <Select value={outcomes[c.id] ?? ''} onValueChange={(v) => setOutcomes((o) => ({ ...o, [c.id]: v }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="met">Met</SelectItem>
                <SelectItem value="partially_met">Partially met</SelectItem>
                <SelectItem value="not_met">Not met</SelectItem>
                <SelectItem value="not_observed">Not enough shown to judge</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quality[c.id] ?? ''} onValueChange={(v) => setQuality((q) => ({ ...q, [c.id]: v }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insufficient">Insufficient</SelectItem>
                <SelectItem value="adequate">Adequate</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Note to the learner</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {unassessed.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Assess every point above — outcome and quality — before recording a decision.
          {' '}{unassessed.length} still open.
        </p>
      )}
      {gatingBlocked && (
        <p className="text-xs text-destructive">
          A required point is not met or not shown, so this evidence cannot be accepted.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={decide.isPending || unassessed.length > 0 || gatingBlocked}
          onClick={() => decide.mutate('accepted')}
        >
          Accept
        </Button>
        <Button
          variant="outline"
          disabled={decide.isPending || unassessed.length > 0}
          onClick={() => decide.mutate('needs_revision')}
        >
          Needs revision
        </Button>
        <Button
          variant="ghost"
          disabled={decide.isPending || unassessed.length > 0}
          onClick={() => decide.mutate('rejected')}
        >
          Not accepted
        </Button>
      </div>
    </div>
  );
}

export function TaskEvidenceReviewQueue() {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = usePendingTaskEvidence();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Step evidence awaiting review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-32 w-full" />}
        {!isLoading && !items?.length && (
          <p className="text-sm text-muted-foreground">Nothing waiting for review right now.</p>
        )}
        {items?.map((item) => (
          <ReviewRow
            key={item.assoc_id}
            item={item}
            onDone={() => {
              queryClient.invalidateQueries({ queryKey: ['pending-task-evidence'] });
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
