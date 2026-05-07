import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScormPlayer } from '@/lib/scorm-player/ScormPlayer';
import { useFgnAcademyProgress } from '@/lib/scorm-player/useFgnAcademyProgress';
import type { CourseManifest, ProgressState } from '@/lib/scorm-player/types';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function ScormPlayerLaunch() {
  const { courseId } = useParams<{ courseId: string }>();
  const [manifest, setManifest] = useState<CourseManifest | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // v0.3 progress sync via scorm-session-complete edge function.
  // Hook handles restore-on-mount, 2s debounce, flush-bypass for terminal
  // events, cumulative→delta time conversion, and 2xx-gated retry. See
  // useFgnAcademyProgress.ts and PHASE_2_SPEC.md §"v0.3 coordination contract".
  const { initialSuspendData, isReady: progressReady, flushProgress, error: progressError } =
    useFgnAcademyProgress(courseId);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from('scorm_courses')
          .select('manifest_url, title, work_order_id')
          .eq('id', courseId)
          .maybeSingle();
        if (dbErr) throw dbErr;
        if (!data?.manifest_url) {
          throw new Error('Course not found or not published.');
        }
        setManifestUrl(data.manifest_url);
        setWorkOrderId((data as { work_order_id?: string | null }).work_order_id ?? null);
        const res = await fetch(data.manifest_url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load manifest: HTTP ${res.status}`);
        const json = (await res.json()) as CourseManifest;
        setManifest(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  // Forward Player state changes to the v0.3 hook. Terminal lesson statuses
  // (passed / failed / completed) bypass the 2s debounce so the credential
  // write isn't gated on a trailing timer.
  const reportProgress = (state: ProgressState) => {
    const isTerminal =
      state.lessonStatus === 'passed' ||
      state.lessonStatus === 'completed' ||
      state.lessonStatus === 'failed';
    flushProgress(state, isTerminal ? { flush: true } : undefined);
  };

  if (loading || !progressReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error ?? 'Course manifest unavailable.'}
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/learn"><ArrowLeft className="h-3 w-3 mr-1" /> Back to Learn</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {progressError && (
        <Alert className="rounded-none border-x-0 border-t-0 border-b border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200">
            Progress sync warning: {progressError}. Your local progress is preserved; we'll retry on the next interaction.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <ScormPlayer
          manifest={manifest}
          manifestBaseUrl={manifestUrl}
          onProgress={reportProgress}
          initialSuspendData={initialSuspendData}
          finishCta={
            workOrderId
              ? { label: 'Return to Work Order', href: `/work-orders/${workOrderId}` }
              : { label: 'Back to Learn', href: '/learn' }
          }
        />
      </div>
    </div>
  );
}
