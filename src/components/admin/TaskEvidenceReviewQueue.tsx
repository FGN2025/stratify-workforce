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

type Pending = {
  assoc_id: string;
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
            .select('id, label, task_id')
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

  const openFile = async () => {
    if (!item.storage_path) return;
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(item.storage_path, 300);
    if (error) {
      toast({ title: 'Could not open file', description: error.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const decide = useMutation({
    mutationFn: async (decision: 'accepted' | 'needs_revision' | 'rejected') => {
      if (!user) throw new Error('Not signed in');
      const rows = criteria.map((c) => ({
        artifact_requirement_id: item.assoc_id,
        criterion_id: c.id,
        outcome: (outcomes[c.id] ?? (decision === 'accepted' ? 'met' : 'not_met')) as 'met' | 'partially_met' | 'not_met',
        evidence_quality: (quality[c.id] ?? (decision === 'accepted' ? 'adequate' : 'insufficient')) as
          | 'insufficient'
          | 'adequate'
          | 'strong',
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
        {item.body_text && <p className="whitespace-pre-wrap">{item.body_text}</p>}
        {item.learner_rationale && (
          <p className="text-muted-foreground">Learner note: {item.learner_rationale}</p>
        )}
      </div>

      <div className="space-y-3">
        {criteria.map((c) => (
          <div key={c.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <p className="text-sm">
                {c.criterion_text}
                {c.is_gating && <Badge className="ml-2 bg-primary/15 text-primary">required</Badge>}
              </p>
              {c.guidance_for_reviewer && (
                <p className="text-xs text-muted-foreground">{c.guidance_for_reviewer}</p>
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

      <div className="flex flex-wrap gap-2">
        <Button disabled={decide.isPending} onClick={() => decide.mutate('accepted')}>
          Accept
        </Button>
        <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate('needs_revision')}>
          Needs revision
        </Button>
        <Button variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate('rejected')}>
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
