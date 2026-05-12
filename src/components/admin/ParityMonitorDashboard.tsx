import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Phase 1 parity targets — Academy ↔ Play ↔ Breakroom ↔ Webhook fan-out.
// T0 = 2026-05-12 ~16:22 UTC; green target = 2026-05-14 ~16:22 UTC.
const PARITY_T0 = new Date('2026-05-12T16:22:00Z');
const PARITY_TARGET_GREEN = new Date('2026-05-14T16:22:00Z');

type RouteRow = {
  route: string;
  surface: 'play' | 'breakroom' | 'webhook';
  total24h: number;
  failed24h: number;
  errorRate: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  staleMinutes: number | null;
};

function freshnessLabel(min: number | null): { label: string; tone: 'ok' | 'warn' | 'bad' | 'idle' } {
  if (min === null) return { label: 'No success yet', tone: 'idle' };
  if (min < 60) return { label: `${Math.round(min)}m ago`, tone: 'ok' };
  if (min < 360) return { label: `${Math.round(min / 60)}h ago`, tone: 'warn' };
  return { label: `${Math.round(min / 60)}h ago`, tone: 'bad' };
}

function statusBadge(row: RouteRow) {
  if (row.total24h === 0) {
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Idle</Badge>;
  }
  if (row.errorRate === 0 && row.staleMinutes !== null && row.staleMinutes < 360) {
    return <Badge className="gap-1 bg-emerald-500/15 text-emerald-300 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> Green</Badge>;
  }
  if (row.errorRate >= 0.25 || (row.staleMinutes ?? 0) > 720) {
    return <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/40"><XCircle className="h-3 w-3" /> Red</Badge>;
  }
  return <Badge className="gap-1 bg-amber-500/15 text-amber-300 border-amber-500/30"><AlertTriangle className="h-3 w-3" /> Yellow</Badge>;
}

async function fetchParityData(): Promise<{ rows: RouteRow[]; sampledAt: string }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [play, breakroom, webhooks] = await Promise.all([
    supabase
      .from('play_sync_attempts')
      .select('action, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('breakroom_sync_attempts')
      .select('sync_outcome, last_attempt_at')
      .gte('last_attempt_at', since)
      .order('last_attempt_at', { ascending: false })
      .limit(2000),
    supabase
      .from('webhook_delivery_log')
      .select('event_type, status_code, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  const buckets = new Map<string, RouteRow>();
  const ensure = (key: string, surface: RouteRow['surface']): RouteRow => {
    let b = buckets.get(key);
    if (!b) {
      b = {
        route: key,
        surface,
        total24h: 0,
        failed24h: 0,
        errorRate: 0,
        lastSuccessAt: null,
        lastErrorAt: null,
        staleMinutes: null,
      };
      buckets.set(key, b);
    }
    return b;
  };

  for (const r of play.data ?? []) {
    const b = ensure(`play:${r.action}`, 'play');
    b.total24h += 1;
    const ok = r.status === 'completed';
    if (!ok) b.failed24h += 1;
    if (ok && !b.lastSuccessAt) b.lastSuccessAt = r.created_at;
    if (!ok && !b.lastErrorAt) b.lastErrorAt = r.created_at;
  }

  for (const r of breakroom.data ?? []) {
    const b = ensure('breakroom:quiz_sync', 'breakroom');
    b.total24h += 1;
    const ok = r.sync_outcome === 'success' || r.sync_outcome === 'completed';
    if (!ok) b.failed24h += 1;
    if (ok && !b.lastSuccessAt) b.lastSuccessAt = r.last_attempt_at;
    if (!ok && !b.lastErrorAt) b.lastErrorAt = r.last_attempt_at;
  }

  for (const r of webhooks.data ?? []) {
    const b = ensure(`webhook:${r.event_type}`, 'webhook');
    b.total24h += 1;
    const ok = r.status_code !== null && r.status_code >= 200 && r.status_code < 300;
    if (!ok) b.failed24h += 1;
    if (ok && !b.lastSuccessAt) b.lastSuccessAt = r.created_at;
    if (!ok && !b.lastErrorAt) b.lastErrorAt = r.created_at;
  }

  const rows = Array.from(buckets.values()).map((b) => {
    b.errorRate = b.total24h > 0 ? b.failed24h / b.total24h : 0;
    if (b.lastSuccessAt) {
      b.staleMinutes = (Date.now() - new Date(b.lastSuccessAt).getTime()) / 60000;
    }
    return b;
  });

  rows.sort((a, b) => {
    const sev = (r: RouteRow) =>
      r.errorRate >= 0.25 ? 0 : r.total24h === 0 ? 3 : r.errorRate > 0 ? 1 : 2;
    const sa = sev(a);
    const sb = sev(b);
    if (sa !== sb) return sa - sb;
    return b.total24h - a.total24h;
  });

  return { rows, sampledAt: new Date().toISOString() };
}

export function ParityMonitorDashboard() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['parity-monitor'],
    queryFn: fetchParityData,
    refetchInterval: 60_000,
  });

  const rows = data?.rows ?? [];
  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total24h;
      acc.failed += r.failed24h;
      if (r.total24h > 0 && r.errorRate === 0 && (r.staleMinutes ?? Infinity) < 360) acc.green += 1;
      else if (r.errorRate >= 0.25 || (r.staleMinutes ?? 0) > 720) acc.red += 1;
      else if (r.total24h > 0) acc.yellow += 1;
      else acc.idle += 1;
      return acc;
    },
    { total: 0, failed: 0, green: 0, yellow: 0, red: 0, idle: 0 },
  );
  const overallErrorRate = totals.total > 0 ? (totals.failed / totals.total) * 100 : 0;

  const now = Date.now();
  const elapsed = (now - PARITY_T0.getTime()) / 1000 / 3600;
  const window = (PARITY_TARGET_GREEN.getTime() - PARITY_T0.getTime()) / 1000 / 3600;
  const watchProgress = Math.max(0, Math.min(1, elapsed / window));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Phase 1 Parity Monitor
            </CardTitle>
            <CardDescription>
              Live freshness + error rate per ecosystem sync route. Sampled hourly via React Query (60s refresh).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatTile label="Routes (Green)" value={totals.green} tone="ok" />
            <StatTile label="Yellow" value={totals.yellow} tone="warn" />
            <StatTile label="Red" value={totals.red} tone="bad" />
            <StatTile label="Idle" value={totals.idle} tone="idle" />
            <StatTile label="Error rate (24h)" value={`${overallErrorRate.toFixed(1)}%`} tone={overallErrorRate > 10 ? 'bad' : overallErrorRate > 2 ? 'warn' : 'ok'} />
          </div>

          <div className="rounded-lg border bg-card/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Parity watch window</span>
              <span className="font-mono text-xs text-muted-foreground">
                T0 {PARITY_T0.toISOString().slice(0, 16).replace('T', ' ')}Z → green by {PARITY_TARGET_GREEN.toISOString().slice(0, 16).replace('T', ' ')}Z
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${watchProgress * 100}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {watchProgress >= 1
                ? 'Target window reached — verify sustained green across all routes.'
                : `~${Math.max(0, window - elapsed).toFixed(1)}h remaining in monitoring window.`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Routes</CardTitle>
          <CardDescription>
            Last 24h. Green = ≥1 success, no failures, last success &lt;6h ago. Red = ≥25% errors or last success &gt;12h ago.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading parity data…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No sync activity in the last 24h.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Route</th>
                    <th className="text-left py-2 pr-4 font-medium">Surface</th>
                    <th className="text-right py-2 pr-4 font-medium">Attempts (24h)</th>
                    <th className="text-right py-2 pr-4 font-medium">Errors</th>
                    <th className="text-right py-2 pr-4 font-medium">Error rate</th>
                    <th className="text-left py-2 pr-4 font-medium">Last success</th>
                    <th className="text-left py-2 pr-4 font-medium">Last error</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const fresh = freshnessLabel(r.staleMinutes);
                    return (
                      <tr key={r.route} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-4 font-mono text-xs">{r.route}</td>
                        <td className="py-2 pr-4 capitalize text-muted-foreground">{r.surface}</td>
                        <td className="py-2 pr-4 text-right font-mono">{r.total24h}</td>
                        <td className={cn('py-2 pr-4 text-right font-mono', r.failed24h > 0 && 'text-destructive')}>
                          {r.failed24h}
                        </td>
                        <td className={cn('py-2 pr-4 text-right font-mono', r.errorRate >= 0.25 ? 'text-destructive' : r.errorRate > 0 ? 'text-amber-300' : 'text-emerald-300')}>
                          {(r.errorRate * 100).toFixed(1)}%
                        </td>
                        <td className={cn(
                          'py-2 pr-4 text-xs',
                          fresh.tone === 'ok' && 'text-emerald-300',
                          fresh.tone === 'warn' && 'text-amber-300',
                          fresh.tone === 'bad' && 'text-destructive',
                          fresh.tone === 'idle' && 'text-muted-foreground',
                        )}>
                          {fresh.label}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {r.lastErrorAt ? formatDistanceToNow(new Date(r.lastErrorAt), { addSuffix: true }) : '—'}
                        </td>
                        <td className="py-2">{statusBadge(r)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data?.sampledAt && (
            <div className="mt-4 text-xs text-muted-foreground">
              Sampled {formatDistanceToNow(new Date(data.sampledAt), { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: 'ok' | 'warn' | 'bad' | 'idle' }) {
  return (
    <div className={cn(
      'rounded-lg border p-3 bg-card/40',
      tone === 'ok' && 'border-emerald-500/30',
      tone === 'warn' && 'border-amber-500/30',
      tone === 'bad' && 'border-destructive/40',
      tone === 'idle' && 'border-border',
    )}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn(
        'text-2xl font-display mt-1',
        tone === 'ok' && 'text-emerald-300',
        tone === 'warn' && 'text-amber-300',
        tone === 'bad' && 'text-destructive',
      )}>
        {value}
      </div>
    </div>
  );
}
