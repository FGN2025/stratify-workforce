import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScormPlayer } from '@/lib/scorm-player/ScormPlayer';
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

  // v0.3: POST to scorm-session-complete with the locked contract payload.
  // For v0 this is a debug-only no-op so toolkit Step 7 wiring sees the shape.
  const reportProgress = (state: ProgressState) => {
    // eslint-disable-next-line no-console
    console.debug('[scorm-player] progress', { courseId, state });
  };

  if (loading) {
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
      <Alert className="rounded-none border-x-0 border-t-0 border-b border-amber-500/40 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-200">
          Preview mode — progress sync ships in v0.3.
        </AlertDescription>
      </Alert>
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <ScormPlayer
          manifest={manifest}
          manifestBaseUrl={manifestUrl}
          onProgress={reportProgress}
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
