import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FlaskConical, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SyncResponse {
  success?: boolean;
  completion?: {
    id: string;
    status: string;
    score: number;
    xp_awarded: number;
    attempt_number: number;
  };
  credential?: { id: string; title: string } | null;
  error?: string;
  details?: string;
}

export function ChallengeSyncTester() {
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [score, setScore] = useState(85);
  const [skills, setSkills] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<SyncResponse | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const handleTest = async () => {
    if (!email || !challengeId || !apiKey) {
      toast({ title: 'Missing fields', description: 'Email, Challenge ID, and API Key are required.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setStatusCode(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/sync-challenge-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-App-Key': apiKey,
        },
        body: JSON.stringify({
          user_email: email,
          challenge_id: challengeId,
          score,
          skills_verified: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
          metadata: { source: 'admin-test-panel', tested_at: new Date().toISOString() },
        }),
      });

      const data = await res.json();
      setStatusCode(res.status);
      setResponse(data);

      if (res.ok && data.success) {
        toast({ title: 'Sync successful', description: `Status: ${data.completion?.status}, XP: ${data.completion?.xp_awarded}` });
      } else {
        toast({ title: `Error (${res.status})`, description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Network error', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-semibold">Challenge Sync Tester</h3>
        <Badge variant="outline" className="text-amber-400 border-amber-400/50">Debug Tool</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Simulate a challenge completion sync call as if it came from play.fgn.gg. 
        This calls the live <code className="text-xs bg-muted px-1 py-0.5 rounded">sync-challenge-completion</code> endpoint.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key (X-App-Key) *</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Paste the FGN Play authorized app API key"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">User Email *</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challenge-id">Challenge ID (source_challenge_id) *</Label>
            <Input
              id="challenge-id"
              placeholder="UUID from play.fgn.gg"
              value={challengeId}
              onChange={e => setChallengeId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Score: {score} {score >= 70 ? '(Pass ✓)' : '(Fail ✗)'}</Label>
            <Slider
              value={[score]}
              onValueChange={v => setScore(v[0])}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills Verified (comma-separated)</Label>
            <Input
              id="skills"
              placeholder="route_planning, fuel_management"
              value={skills}
              onChange={e => setSkills(e.target.value)}
            />
          </div>
          <Button onClick={handleTest} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Test Sync
          </Button>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Response
              {statusCode && (
                <Badge variant={statusCode === 200 ? 'default' : 'destructive'}>
                  {statusCode}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">Raw response from the endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {response.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium text-sm">
                    {response.success ? 'Sync Successful' : response.error || 'Failed'}
                  </span>
                </div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No response yet. Send a test sync to see results.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
