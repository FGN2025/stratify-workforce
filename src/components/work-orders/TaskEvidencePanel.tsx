import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkOrderTasks } from '@/hooks/useWorkOrderTasks';
import {
  useTaskEvidenceRequirements,
  useAttemptEvidence,
  useSubmitTaskEvidence,
  type EvidenceRequirementRow,
  type AssociationRow,
} from '@/hooks/useTaskEvidence';

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  claimed: { label: 'Submitted', icon: Clock, className: 'bg-muted text-muted-foreground' },
  under_review: { label: 'Under review', icon: Clock, className: 'bg-muted text-muted-foreground' },
  accepted: { label: 'Accepted', icon: CheckCircle2, className: 'bg-primary/15 text-primary' },
  needs_revision: { label: 'Needs revision', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
  rejected: { label: 'Not accepted', icon: XCircle, className: 'bg-destructive/15 text-destructive' },
};

function mmss(seconds?: number | null) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimecode(value: string): number | null {
  if (!value.trim()) return null;
  const parts = value.split(':').map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
}

interface Props {
  workOrderId: string;
  completionId: string | null;
}

export function TaskEvidencePanel({ workOrderId, completionId }: Props) {
  const { toast } = useToast();
  const { data: tasks = [] } = useWorkOrderTasks(workOrderId);
  const { data: requirements = [] } = useTaskEvidenceRequirements(workOrderId);
  const { data: attempt } = useAttemptEvidence(workOrderId, completionId);
  const submit = useSubmitTaskEvidence();

  const [target, setTarget] = useState<{ req: EvidenceRequirementRow; taskId: string; replacing?: AssociationRow } | null>(
    null,
  );
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [rationale, setRationale] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reuseArtifactId, setReuseArtifactId] = useState('new');
  const [structured, setStructured] = useState<Record<string, string>>({});

  const byTask = useMemo(() => {
    const map = new Map<string, EvidenceRequirementRow[]>();
    requirements.forEach((r) => map.set(r.task_id, [...(map.get(r.task_id) ?? []), r]));
    return map;
  }, [requirements]);

  if (!requirements.length) return null;

  const associations = attempt?.associations ?? [];
  const artifacts = attempt?.artifacts ?? [];
  const demos = attempt?.demonstrations ?? [];

  const reset = () => {
    setTarget(null);
    setTitle('');
    setFile(null);
    setBodyText('');
    setRationale('');
    setFrom('');
    setTo('');
    setReuseArtifactId('new');
    setStructured({});
  };

  const handleSubmit = async () => {
    if (!target || !completionId) return;
    const fields = target.req.response_schema?.fields ?? [];
    const wantsText = target.req.accepted_evidence_types.some((t) =>
      ['written_annotation', 'structured_form'].includes(t),
    );

    let bodyStructured: Record<string, unknown> | undefined;
    if (reuseArtifactId === 'new' && fields.length) {
      const missing = fields.filter((f) => f.required !== false && !String(structured[f.key] ?? '').trim());
      if (missing.length) {
        toast({ title: `Fill in ${missing[0].label}`, variant: 'destructive' });
        return;
      }
      const outOfRange = fields.find((f) => {
        if (f.type !== 'number' && f.type !== 'integer') return false;
        const raw = String(structured[f.key] ?? '').trim();
        if (!raw) return false;
        const n = Number(raw);
        if (Number.isNaN(n)) return true;
        if (f.type === 'integer' && !Number.isInteger(n)) return true;
        if (f.min != null && n < f.min) return true;
        if (f.max != null && n > f.max) return true;
        return false;
      });
      if (outOfRange) {
        toast({ title: `Check the value for ${outOfRange.label}`, variant: 'destructive' });
        return;
      }
      bodyStructured = { schema_version: target.req.response_schema?.version ?? 1 };
      fields.forEach((f) => {
        const raw = String(structured[f.key] ?? '').trim();
        if (!raw) return;
        (bodyStructured as Record<string, unknown>)[f.key] =
          f.type === 'number' || f.type === 'integer' ? Number(raw) : raw;
      });
    }

    if (reuseArtifactId === 'new' && !file && !bodyText.trim() && !bodyStructured) {
      toast({ title: wantsText ? 'Write your response first' : 'Choose a file first', variant: 'destructive' });
      return;
    }
    try {
      await submit.mutateAsync({
        bodyStructured,
        workOrderId,
        completionId,
        taskId: target.taskId,
        requirementId: target.req.id,
        supersedesAssociationId: target.replacing?.id,
        reuseArtifactId: reuseArtifactId === 'new' ? undefined : reuseArtifactId,
        title: title || undefined,
        file: file ?? undefined,
        bodyText: bodyText.trim() || undefined,
        learnerRationale: rationale.trim() || undefined,
        timecodeStart: parseTimecode(from),
        timecodeEnd: parseTimecode(to),
      });
      toast({ title: 'Evidence submitted', description: 'Your instructor will review it.' });
      reset();
    } catch (e) {
      toast({ title: 'Could not submit', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Evidence for each step</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!completionId && (
            <p className="text-sm text-muted-foreground">Start the work order to begin submitting evidence.</p>
          )}
          {tasks
            .filter((t) => byTask.has(t.id))
            .map((task) => {
              const demo = demos.find((d) => d.task_id === task.id);
              return (
                <div key={task.id} className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold">
                      {task.order_index}. {task.title}
                    </h4>
                    {demo?.status === 'demonstrated' ? (
                      <Badge className="bg-primary/15 text-primary">Step complete</Badge>
                    ) : demo ? (
                      <Badge variant="outline" className="capitalize">
                        {demo.status.replace(/_/g, ' ')}
                      </Badge>
                    ) : null}
                  </div>

                  {(byTask.get(task.id) ?? []).map((req) => {
                    const active = associations.filter((a) => a.requirement_id === req.id && a.is_active);
                    const history = associations.filter((a) => a.requirement_id === req.id && !a.is_active);
                    const needsRevision = active.find((a) => a.association_status === 'needs_revision');
                    const needed = req.min_artifacts ?? 1;
                    const counted = active.filter((a) => a.association_status !== 'rejected').length;
                    const remaining = Math.max(0, needed - counted);

                    return (
                      <div key={req.id} className="rounded-md bg-muted/30 p-3 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {req.label}
                              {!req.is_required && <span className="text-muted-foreground"> (optional)</span>}
                            </p>
                            {req.instructions && (
                              <p className="text-xs text-muted-foreground mt-1">{req.instructions}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={needsRevision ? 'default' : 'outline'}
                            disabled={!completionId}
                            onClick={() => setTarget({ req, taskId: task.id, replacing: needsRevision })}
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            {needsRevision ? 'Replace evidence' : active.length ? 'Add evidence' : 'Submit evidence'}
                          </Button>
                        </div>

                        {needed > 1 && (
                          <p className={`text-xs ${remaining ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {counted} of {needed} required submitted
                            {remaining > 0
                              ? ` — ${remaining} more still needed before this can be reviewed.`
                              : ' — complete.'}
                          </p>
                        )}


                        {[...active, ...history].map((assoc) => {
                          const meta = STATUS_META[assoc.association_status] ?? STATUS_META.claimed;
                          const Icon = meta.icon;
                          const artifact = artifacts.find((a) => a.id === assoc.artifact_id);
                          return (
                            <div
                              key={assoc.id}
                              className={`flex flex-wrap items-center gap-2 text-xs rounded border border-border/60 px-2 py-1.5 ${
                                assoc.is_active ? '' : 'opacity-60'
                              }`}
                            >
                              <Badge className={meta.className}>
                                <Icon className="h-3 w-3 mr-1" />
                                {meta.label}
                              </Badge>
                              <span className="font-medium">{artifact?.title ?? 'Evidence'}</span>
                              {assoc.timecode_start_seconds != null && (
                                <span className="text-muted-foreground">
                                  {mmss(assoc.timecode_start_seconds)}–{mmss(assoc.timecode_end_seconds)}
                                </span>
                              )}
                              {!assoc.is_active && <span className="text-muted-foreground">(earlier submission)</span>}
                              {assoc.reviewer_note && (
                                <span className="text-muted-foreground w-full">Reviewer: {assoc.reviewer_note}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{target?.req.label}</DialogTitle>
            <DialogDescription>{target?.req.instructions}</DialogDescription>
          </DialogHeader>

          {!!target && (
            <div className="space-y-4">
              {target.req.criteria.length > 0 && (
                <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-medium">What the reviewer looks for</p>
                  {target.req.criteria.map((c) => (
                    <p key={c.id} className="text-muted-foreground">
                      • {c.criterion_text}
                      {c.is_gating && <span className="text-foreground"> (required)</span>}
                    </p>
                  ))}
                </div>
              )}

              {artifacts.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Use something you already submitted</Label>
                  <Select value={reuseArtifactId} onValueChange={setReuseArtifactId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Submit something new</SelectItem>
                      {artifacts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title ?? 'Untitled'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reuseArtifactId === 'new' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short description" />
                  </div>
                  {target.req.accepted_evidence_types.some((t) =>
                    ['written_annotation', 'structured_form'].includes(t),
                  ) ? (
                    <div className="space-y-1.5">
                      <Label>Your written response</Label>
                      <Textarea
                        rows={6}
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Explain your reasoning in your own words."
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>File</Label>
                      <Input
                        type="file"
                        accept="image/*,video/*,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Starts at (optional)</Label>
                  <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="0:42" />
                </div>
                <div className="space-y-1.5">
                  <Label>Ends at (optional)</Label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0:58" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Anything the reviewer should know (optional)</Label>
                <Textarea rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
