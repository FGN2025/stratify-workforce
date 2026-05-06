import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useScormBuild, type ScormBuildRequest } from '@/hooks/useScormBuild';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wrench, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WorkOrder {
  id: string;
  title: string;
  game_title: string | null;
  source_challenge_id: string | null;
  is_active: boolean;
}

export default function CourseBuilder() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWO, setLoadingWO] = useState(true);
  const [form, setForm] = useState<ScormBuildRequest>({
    workOrderId: '',
    destination: 'fgn-academy',
    brandMode: 'arcade',
    scormVersion: '1.2',
    enhanceText: false,
    enhanceCover: false,
  });

  const { build, isBuilding, result, error, reset } = useScormBuild();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('work_orders')
        .select('id, title, game_title, source_challenge_id, is_active')
        .eq('is_active', true)
        .not('source_challenge_id', 'is', null)
        .order('title');
      setWorkOrders((data as WorkOrder[] | null) ?? []);
      setLoadingWO(false);
    })();
  }, []);

  const update = <K extends keyof ScormBuildRequest>(k: K, v: ScormBuildRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onBuild = async () => {
    if (!form.workOrderId) return;
    await build({
      ...form,
      title: form.title?.trim() || undefined,
      description: form.description?.trim() || undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-wide flex items-center gap-2">
            <Wrench className="h-7 w-7 text-primary" /> Course Builder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate SCORM courses from published Work Orders.
          </p>
        </div>
        <Badge variant="outline" className="font-mono">scorm-build · Phase 2 v0</Badge>
      </header>

      <Card className="p-6 space-y-5 bg-card/50 backdrop-blur border-border">
        <div className="space-y-2">
          <Label>Source Work Order</Label>
          {loadingWO ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading work orders…
            </div>
          ) : (
            <Select value={form.workOrderId || 'none'} onValueChange={(v) => update('workOrderId', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select a work order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Select —</SelectItem>
                {workOrders.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.title} {w.game_title ? `· ${w.game_title}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Only active work orders with a linked play.fgn.gg challenge are listed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Destination</Label>
            <Select value={form.destination} onValueChange={(v) => update('destination', v as ScormBuildRequest['destination'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fgn-academy">fgn.academy (native)</SelectItem>
                <SelectItem value="broadband-workforce">Broadband Workforce</SelectItem>
                <SelectItem value="simu-cdl-path">Simu-CDL Path</SelectItem>
                <SelectItem value="external-lms">External LMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Brand Mode</Label>
            <Select value={form.brandMode} onValueChange={(v) => update('brandMode', v as ScormBuildRequest['brandMode'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="arcade">Arcade</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SCORM Version</Label>
            <Select value={form.scormVersion} onValueChange={(v) => update('scormVersion', v as ScormBuildRequest['scormVersion'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1.2">SCORM 1.2</SelectItem>
                <SelectItem value="cmi5">cmi5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Title override (optional)</Label>
          <Input value={form.title ?? ''} onChange={(e) => update('title', e.target.value)} placeholder="Derived from challenge if blank" />
        </div>

        <div className="space-y-2">
          <Label>Description override (optional)</Label>
          <Textarea value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} rows={3} />
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">AI Enhancement</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="enhText" checked={!!form.enhanceText} onCheckedChange={(v) => update('enhanceText', !!v)} />
            <Label htmlFor="enhText" className="font-normal cursor-pointer">
              Rewrite description & briefings (Anthropic)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="enhCover" checked={!!form.enhanceCover} onCheckedChange={(v) => update('enhanceCover', !!v)} />
            <Label htmlFor="enhCover" className="font-normal cursor-pointer">
              Regenerate cover image (OpenAI gpt-image-2)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Toolkit Steps 5/6 ship the AI slots; flags pass through to scorm-build today.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={onBuild} disabled={!form.workOrderId || isBuilding}>
            {isBuilding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isBuilding ? 'Building…' : 'Build SCORM Course'}
          </Button>
          {(result || error) && (
            <Button variant="outline" onClick={reset}>Clear</Button>
          )}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-primary/40">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-display font-semibold text-lg">
              {result.isReplacement ? 'Course replaced' : 'Course built'}: {result.title}
            </h3>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Course ID</dt>
              <dd className="font-mono text-xs break-all">{result.courseId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Manifest</dt>
              <dd><a className="text-primary hover:underline break-all" href={result.manifestUrl} target="_blank" rel="noreferrer">course.json <ExternalLink className="inline h-3 w-3" /></a></dd>
            </div>
            {result.zipUrl && (
              <div>
                <dt className="text-muted-foreground">SCORM ZIP</dt>
                <dd><a className="text-primary hover:underline" href={result.zipUrl} target="_blank" rel="noreferrer">Download <ExternalLink className="inline h-3 w-3" /></a></dd>
              </div>
            )}
            {result.playerUrl && (
              <div>
                <dt className="text-muted-foreground">Native Player</dt>
                <dd>
                  <Button asChild size="sm" variant="default">
                    <Link to={`/scorm-player/${result.courseId}/launch`}>Open in Player</Link>
                  </Button>
                </dd>
              </div>
            )}
          </dl>

          {result.warnings.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Warnings ({result.warnings.length})</p>
              {result.warnings.map((w, i) => (
                <Alert key={i} variant={w.level === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{w.code}</Badge>
                      <span className="text-xs uppercase">{w.level}</span>
                    </div>
                    <p className="mt-1">{w.message}</p>
                    {w.suggestion && <p className="mt-1 text-xs text-muted-foreground">→ {w.suggestion}</p>}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
