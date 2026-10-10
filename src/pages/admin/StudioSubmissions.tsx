import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { PackageOpen, CheckCircle2, XCircle, MessageSquareWarning, Clock, FileWarning } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Submission = {
  id: string;
  title: string;
  description: string | null;
  scorm_version: string;
  package_size_bytes: number;
  validation_status: 'pending' | 'valid' | 'validation_failed';
  validation_errors: string[] | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  review_note: string | null;
  reviewed_at: string | null;
  manifest_summary: Record<string, unknown> | null;
  request_work_order_creation: boolean;
  source_work_order_ids: string[];
  scorm_course_id: string | null;
  generated_work_order_id: string | null;
  created_at: string;
  app_id: string;
};

const VALIDATION_BADGE: Record<Submission['validation_status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Validating', variant: 'secondary' },
  valid: { label: 'Valid package', variant: 'default' },
  validation_failed: { label: 'Validation failed', variant: 'destructive' },
};

const REVIEW_BADGE: Record<Submission['review_status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Awaiting review', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  needs_revision: { label: 'Needs revision', variant: 'secondary' },
};

export default function StudioSubmissions() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['studio-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: string; note?: string }) => {
      const { data, error } = await supabase.functions.invoke('studio-submit/review', {
        body: { submissionId: id, action, note: note || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.reviewStatus === 'approved'
          ? 'Submission approved — course created inactive until published.'
          : `Submission marked ${data.reviewStatus}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['studio-submissions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <PackageOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-display">Studio Submissions</h1>
          <p className="text-muted-foreground">
            Packages submitted from studio.fgn.gg. Approval creates an inactive course — nothing goes live until you publish it.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : !submissions?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No submissions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const validation = VALIDATION_BADGE[sub.validation_status];
            const reviewBadge = REVIEW_BADGE[sub.review_status];
            const summary = (sub.manifest_summary ?? {}) as Record<string, unknown>;
            const canApprove = sub.review_status === 'pending' && sub.validation_status === 'valid';
            const canDecide = sub.review_status === 'pending';
            return (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-xl">{sub.title}</CardTitle>
                      <CardDescription>
                        Submitted {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })} ·{' '}
                        SCORM {sub.scorm_version} · {(sub.package_size_bytes / 1024 / 1024).toFixed(2)} MB
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={validation.variant}>{validation.label}</Badge>
                      <Badge variant={reviewBadge.variant}>{reviewBadge.label}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sub.description && <p className="text-sm text-muted-foreground">{sub.description}</p>}

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    {typeof summary.manifestTitle === 'string' && <span>Manifest: {summary.manifestTitle}</span>}
                    {typeof summary.itemCount === 'number' && <span>{summary.itemCount} items</span>}
                    {typeof summary.organizationCount === 'number' && <span>{summary.organizationCount} organizations</span>}
                    {sub.request_work_order_creation && <span>Requested Work Order creation</span>}
                    {sub.source_work_order_ids.length > 0 && <span>{sub.source_work_order_ids.length} linked Work Order(s)</span>}
                  </div>

                  {sub.validation_errors?.length ? (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                      <FileWarning className="h-4 w-4 mt-0.5 text-destructive" />
                      <ul className="list-disc pl-4 space-y-1">
                        {sub.validation_errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  ) : null}

                  {sub.review_status !== 'pending' && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Reviewed {sub.reviewed_at ? formatDistanceToNow(new Date(sub.reviewed_at), { addSuffix: true }) : ''}
                        {sub.review_note ? ` — ${sub.review_note}` : ''}
                      </p>
                      {sub.scorm_course_id && <p>Course: {sub.scorm_course_id} (inactive until published)</p>}
                      {sub.generated_work_order_id && <p>Draft Work Order: {sub.generated_work_order_id}</p>}
                    </div>
                  )}

                  {canDecide && (
                    <div className="space-y-3 border-t pt-4">
                      <Textarea
                        placeholder="Review note (optional, visible to the submitting app)"
                        value={notes[sub.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={!canApprove || review.isPending}
                          onClick={() => review.mutate({ id: sub.id, action: 'approved', note: notes[sub.id] })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: sub.id, action: 'needs_revision', note: notes[sub.id] })}
                        >
                          <MessageSquareWarning className="h-4 w-4 mr-1" /> Needs revision
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: sub.id, action: 'rejected', note: notes[sub.id] })}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        {!canApprove && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> Approval unlocks once the package passes validation
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
