import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, CheckCircle, AlertTriangle, Loader2, Clock, RefreshCw, EyeOff } from 'lucide-react';

interface SourceHealth {
  slug: string;
  display_name: string;
  is_active: boolean;
  strict_mode: boolean;
  shadow_mode: boolean;
  last_success_at: string | null;
  failures_7d: number;
  retry_backlog: number;
  status: string;
}

interface ProgramHealth {
  key: string;
  name: string;
  availability: string;
  work_orders: number;
  outbound_backlog: number;
  last_outbound_success_at: string | null;
  status: string;
}

interface HealthResponse {
  contract_version: string;
  checked_at: string;
  sources: SourceHealth[];
  programs: ProgramHealth[];
  error?: string;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never';

export function ProgramIntegrationHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      setData(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const StatusIcon = ({ status }: { status: string }) =>
    status === 'pass'
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertTriangle className="h-4 w-4 text-amber-500" />;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Per-Program Integration Health
          </CardTitle>
          <Button onClick={load} disabled={isLoading} size="sm" variant="outline" className="h-8">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Refresh
          </Button>
        </div>
        <CardDescription className="text-xs">
          Backlog, recent failures and last successful sync for each learning source and program.
          {data?.contract_version && <> Contract {data.contract_version}.</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {data?.error && <p className="text-xs text-destructive">{data.error}</p>}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Learning sources</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(data?.sources ?? []).map((s) => (
              <div key={s.slug} className="rounded-lg border border-border/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.display_name}</span>
                  <div className="flex items-center gap-1.5">
                    {s.shadow_mode && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                        <EyeOff className="h-2.5 w-2.5" /> shadow
                      </Badge>
                    )}
                    <StatusIcon status={s.status} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Last success {fmtDate(s.last_success_at)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!s.is_active && <Badge variant="destructive" className="text-[10px] h-4 px-1">inactive</Badge>}
                  {!s.strict_mode && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">relaxed signing</Badge>
                  )}
                  {s.failures_7d > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1">{s.failures_7d} failures (7d)</Badge>
                  )}
                  {s.retry_backlog > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{s.retry_backlog} queued retries</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Programs</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.programs ?? []).map((p) => (
              <div key={p.key} className="rounded-lg border border-border/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <StatusIcon status={p.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Last outbound {fmtDate(p.last_outbound_success_at)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{p.work_orders} work orders</Badge>
                  {p.availability !== 'live' && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{p.availability}</Badge>
                  )}
                  {p.outbound_backlog > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1">{p.outbound_backlog} backlog</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
