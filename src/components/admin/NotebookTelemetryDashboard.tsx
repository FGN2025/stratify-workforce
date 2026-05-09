import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

type Attempt = {
  id: string;
  status: 'hit' | 'miss' | 'skip';
  reason: string | null;
  context_type: string | null;
  game_title: string | null;
  persona_id: string | null;
  notebook_id: string | null;
  citation_count: number;
  latency_ms: number | null;
  created_at: string;
};

const RANGES = [
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
];

const STATUS_COLORS: Record<string, string> = {
  hit: 'hsl(var(--primary))',
  miss: 'hsl(var(--destructive))',
  skip: 'hsl(var(--muted-foreground))',
};

function bucketKey(ts: string, hours: number) {
  const d = new Date(ts);
  if (hours <= 24) {
    // hourly
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function NotebookTelemetryDashboard() {
  const [range, setRange] = useState('7d');
  const [groupBy, setGroupBy] = useState<'context_type' | 'game_title'>('game_title');

  const rangeCfg = RANGES.find((r) => r.value === range)!;

  const { data, isLoading } = useQuery({
    queryKey: ['notebook-attempts', range],
    queryFn: async () => {
      const since = new Date(Date.now() - rangeCfg.hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('notebook_attempts')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(5000);
      if (error) throw error;
      return data as Attempt[];
    },
  });

  const attempts = data ?? [];

  const totals = useMemo(() => {
    const t = { hit: 0, miss: 0, skip: 0, total: 0 };
    attempts.forEach((a) => {
      t[a.status]++;
      t.total++;
    });
    return t;
  }, [attempts]);

  const timeSeries = useMemo(() => {
    const buckets = new Map<string, { bucket: string; hit: number; miss: number; skip: number }>();
    attempts.forEach((a) => {
      const key = bucketKey(a.created_at, rangeCfg.hours);
      if (!buckets.has(key)) buckets.set(key, { bucket: key, hit: 0, miss: 0, skip: 0 });
      buckets.get(key)![a.status]++;
    });
    return Array.from(buckets.values());
  }, [attempts, rangeCfg.hours]);

  const groupedSeries = useMemo(() => {
    const groups = new Map<string, { name: string; hit: number; miss: number; skip: number }>();
    attempts.forEach((a) => {
      const name = (a[groupBy] as string | null) ?? '(none)';
      if (!groups.has(name)) groups.set(name, { name, hit: 0, miss: 0, skip: 0 });
      groups.get(name)![a.status]++;
    });
    return Array.from(groups.values()).sort(
      (a, b) => b.hit + b.miss + b.skip - (a.hit + a.miss + a.skip)
    );
  }, [attempts, groupBy]);

  const avgLatency = useMemo(() => {
    const hits = attempts.filter((a) => a.status === 'hit' && a.latency_ms != null);
    if (!hits.length) return null;
    return Math.round(hits.reduce((s, a) => s + (a.latency_ms ?? 0), 0) / hits.length);
  }, [attempts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notebook Telemetry</h2>
          <p className="text-sm text-muted-foreground">
            Atlas knowledge-base lookup outcomes (hit / miss / skip).
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="game_title">Group by SIM</SelectItem>
              <SelectItem value="context_type">Group by Persona</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total" value={totals.total} />
            <StatCard label="Hits" value={totals.hit} variant="hit" />
            <StatCard label="Misses" value={totals.miss} variant="miss" />
            <StatCard label="Skipped" value={totals.skip} variant="skip" />
            <StatCard label="Avg latency (hit)" value={avgLatency != null ? `${avgLatency}ms` : '—'} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Attempts over time</CardTitle></CardHeader>
            <CardContent className="h-72">
              {timeSeries.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="hit" stackId="s" fill={STATUS_COLORS.hit} />
                    <Bar dataKey="miss" stackId="s" fill={STATUS_COLORS.miss} />
                    <Bar dataKey="skip" stackId="s" fill={STATUS_COLORS.skip} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                By {groupBy === 'game_title' ? 'SIM' : 'Persona context'}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {groupedSeries.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupedSeries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="hit" stackId="s" fill={STATUS_COLORS.hit} />
                    <Bar dataKey="miss" stackId="s" fill={STATUS_COLORS.miss} />
                    <Bar dataKey="skip" stackId="s" fill={STATUS_COLORS.skip} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent attempts</CardTitle></CardHeader>
            <CardContent>
              {attempts.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 text-left font-medium">Time</th>
                        <th className="py-2 text-left font-medium">Status</th>
                        <th className="py-2 text-left font-medium">SIM</th>
                        <th className="py-2 text-left font-medium">Context</th>
                        <th className="py-2 text-left font-medium">Citations</th>
                        <th className="py-2 text-left font-medium">Latency</th>
                        <th className="py-2 text-left font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.slice(-25).reverse().map((a) => (
                        <tr key={a.id} className="border-b border-border/50">
                          <td className="py-2 text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                          <td className="py-2">
                            <Badge
                              variant={a.status === 'hit' ? 'default' : a.status === 'miss' ? 'destructive' : 'secondary'}
                            >
                              {a.status}
                            </Badge>
                          </td>
                          <td className="py-2">{a.game_title ?? '—'}</td>
                          <td className="py-2">{a.context_type ?? '—'}</td>
                          <td className="py-2">{a.citation_count}</td>
                          <td className="py-2">{a.latency_ms != null ? `${a.latency_ms}ms` : '—'}</td>
                          <td className="py-2 text-muted-foreground">{a.reason ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number | string; variant?: 'hit' | 'miss' | 'skip' }) {
  const color =
    variant === 'hit' ? 'text-primary'
    : variant === 'miss' ? 'text-destructive'
    : variant === 'skip' ? 'text-muted-foreground'
    : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No notebook attempts in this window yet.
    </div>
  );
}
