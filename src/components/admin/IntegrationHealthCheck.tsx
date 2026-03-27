import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Activity, CheckCircle, XCircle, Loader2, SkipForward, Clock } from 'lucide-react';

interface CheckResult {
  status: string;
  latency_ms: number;
  error?: string;
  challenge_count?: number;
}

interface HealthResponse {
  play_fgn_connection: CheckResult;
  sync_endpoint: CheckResult;
  checked_at: string;
  error?: string;
}

export function IntegrationHealthCheck() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HealthResponse | null>(null);

  const runCheck = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/health-check-play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ api_key: apiKey || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: `Error (${res.status})`, description: data.error || 'Health check failed', variant: 'destructive' });
        return;
      }

      setResult(data);

      const allPass = data.play_fgn_connection?.status === 'pass' &&
        (data.sync_endpoint?.status === 'pass' || data.sync_endpoint?.status === 'skipped');

      toast({
        title: allPass ? 'All checks passed' : 'Some checks failed',
        description: allPass ? 'FGN Play integration is healthy.' : 'Review the results below.',
        variant: allPass ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({ title: 'Network error', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'pass') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'skipped') return <SkipForward className="h-5 w-5 text-muted-foreground" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Integration Health Check
        </CardTitle>
        <CardDescription className="text-xs">
          Validates that API keys for the play.fgn.gg integration are still working.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="hc-api-key" className="text-xs">Authorized App API Key (optional — tests sync endpoint)</Label>
            <Input
              id="hc-api-key"
              type="password"
              placeholder="Paste API key to also test sync endpoint"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <Button onClick={runCheck} disabled={isLoading} size="sm">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Activity className="h-4 w-4 mr-1.5" />}
            Run Check
          </Button>
        </div>

        {result && (
          <div className="grid gap-3 sm:grid-cols-2">
            {/* play.fgn.gg connection */}
            <div className="rounded-lg border border-border/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">play.fgn.gg Database</span>
                <StatusIcon status={result.play_fgn_connection.status} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.play_fgn_connection.latency_ms}ms
                {result.play_fgn_connection.challenge_count !== undefined && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {result.play_fgn_connection.challenge_count} challenges
                  </Badge>
                )}
              </div>
              {result.play_fgn_connection.error && (
                <p className="text-xs text-destructive">{result.play_fgn_connection.error}</p>
              )}
            </div>

            {/* sync endpoint */}
            <div className="rounded-lg border border-border/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sync Endpoint</span>
                <StatusIcon status={result.sync_endpoint.status} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.sync_endpoint.latency_ms}ms
              </div>
              {result.sync_endpoint.error && (
                <p className="text-xs text-muted-foreground">{result.sync_endpoint.error}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
