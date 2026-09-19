import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send, RefreshCw, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

interface QueueRow {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  payload: Record<string, unknown>;
}

interface PushResult {
  configured: boolean;
  reason?: string;
  target?: string;
  dry_run?: boolean;
  pending_count?: number;
  processed?: number;
  delivered?: number;
  failed?: number;
}

const statusVariant = (status: string) =>
  status === 'delivered' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';

export function PlayOutboundPanel() {
  const [isPushing, setIsPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: ['play-outbound-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('play_outbound_queue' as never)
        .select('id, event_type, status, attempts, last_error, created_at, payload')
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as QueueRow[];
    },
  });

  const run = async (body: Record<string, unknown>) => {
    setIsPushing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('push-play-progress', { body });
      if (error) throw error;
      setResult(data as PushResult);
      const res = data as PushResult;
      if (res.configured === false) {
        toast({ title: 'Not connected yet', description: res.reason, variant: 'destructive' });
      } else if (!res.dry_run) {
        toast({
          title: 'Push complete',
          description: `${res.delivered ?? 0} sent, ${res.failed ?? 0} failed.`,
        });
      }
      refetch();
    } catch (e) {
      toast({
        title: 'Push failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const pendingCount = (rows ?? []).filter((r) => r.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Progress sent to play.fgn.gg
        </CardTitle>
        <CardDescription>
          Completed Work Orders and finished tasks are queued here automatically and delivered to Play,
          signed with the shared ecosystem key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run({ dry_run: true })} disabled={isPushing} variant="outline">
            {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Check connection
          </Button>
          <Button onClick={() => run({ retry_failed: true })} disabled={isPushing}>
            {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send queued updates
          </Button>
          <Badge variant="secondary" className="self-center">{pendingCount} waiting</Badge>
        </div>

        {result && (
          <div className="rounded-md border p-3 text-sm">
            {result.configured === false ? (
              <p className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {result.reason}
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {result.dry_run
                  ? `Connected. ${result.pending_count ?? 0} update(s) ready to send.`
                  : `${result.delivered ?? 0} delivered, ${result.failed ?? 0} failed.`}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (rows ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing queued yet.</p>
          )}
          {(rows ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {String((r.payload as { work_order_title?: string })?.work_order_title ?? r.event_type)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {String((r.payload as { user_email?: string })?.user_email ?? '')} ·{' '}
                  {new Date(r.created_at).toLocaleString()}
                  {r.last_error ? ` · ${r.last_error}` : ''}
                </p>
              </div>
              <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
