import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  useScormBuild,
  type ScormBuildRequest,
  type ScormBuildResponse,
  type ValidationIssue,
} from '@/hooks/useScormBuild';
import type { CourseManifest, CourseModule, QuizQuestion } from '@/lib/scorm-player/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Wrench,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Rocket,
  ChevronLeft,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

interface WorkOrder {
  id: string;
  title: string;
  game_title: string | null;
  source_challenge_id: string | null;
  is_active: boolean;
}

type Stage = 'configure' | 'preview' | 'published';

// Server's narrow allowlist; we strip everything else client-side too.
const ALLOWED_TAGS = new Set(['p', 'strong', 'em', 'h3', 'ul', 'li']);
function sanitizeBriefing(html: string): string {
  // Strip script/style fully, then tags not in allowlist (preserve their text content).
  return html
    .replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag: string) =>
      ALLOWED_TAGS.has(tag.toLowerCase()) ? m.replace(/\s+on\w+="[^"]*"/gi, '').replace(/\s+style="[^"]*"/gi, '') : ''
    );
}

export default function CourseBuilder() {
  const [searchParams] = useSearchParams();
  const prefillWoId = searchParams.get('workOrderId') ?? '';
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWO, setLoadingWO] = useState(true);
  const [stage, setStage] = useState<Stage>('configure');
  const [form, setForm] = useState<ScormBuildRequest>({
    workOrderId: prefillWoId,
    destination: 'fgn-academy',
    brandMode: 'arcade',
    scormVersion: '1.2',
    enhanceText: false,
    enhanceCover: false,
  });

  // Per-module overrides edited in Preview stage
  const [briefingHtml, setBriefingHtml] = useState<Record<string, string>>({});
  const [quizQuestions, setQuizQuestions] = useState<Record<string, QuizQuestion[]>>({});
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const { build, isBuilding, response, reset } = useScormBuild();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('work_orders')
        .select('id, title, game_title, source_challenge_id, is_active')
        .eq('is_active', true)
        .not('source_challenge_id', 'is', null)
        .order('title');
      let list = (data as WorkOrder[] | null) ?? [];
      if (prefillWoId && !list.some((w) => w.id === prefillWoId)) {
        const { data: extra } = await supabase
          .from('work_orders')
          .select('id, title, game_title, source_challenge_id, is_active')
          .eq('id', prefillWoId)
          .maybeSingle();
        if (extra) list = [extra as WorkOrder, ...list];
      }
      setWorkOrders(list);
      setLoadingWO(false);
    })();
  }, [prefillWoId]);

  // beforeunload guard for unsaved overrides during Preview
  useEffect(() => {
    if (!hasUnsaved || stage !== 'preview') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved, stage]);

  const update = <K extends keyof ScormBuildRequest>(k: K, v: ScormBuildRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPreview = async () => {
    if (!form.workOrderId) return;
    const r = await build({
      ...form,
      title: form.title?.trim() || undefined,
      description: form.description?.trim() || undefined,
      dryRun: true,
      briefingHtml: Object.keys(briefingHtml).length ? briefingHtml : undefined,
      quizQuestions: Object.keys(quizQuestions).length ? quizQuestions : undefined,
    });
    if (r.kind === 'preview') {
      setStage('preview');
      // Seed override editors from the manifest if not already set
      const seedBrief: Record<string, string> = { ...briefingHtml };
      const seedQuiz: Record<string, QuizQuestion[]> = { ...quizQuestions };
      for (const m of r.manifest.modules) {
        if (m.type === 'briefing' && seedBrief[m.id] === undefined) seedBrief[m.id] = m.html;
        if (m.type === 'quiz' && seedQuiz[m.id] === undefined) seedQuiz[m.id] = m.questions;
      }
      setBriefingHtml(seedBrief);
      setQuizQuestions(seedQuiz);
      setHasUnsaved(false);
    }
  };

  const onPublish = async () => {
    const r = await build({
      ...form,
      title: form.title?.trim() || undefined,
      description: form.description?.trim() || undefined,
      dryRun: false,
      briefingHtml: Object.keys(briefingHtml).length ? briefingHtml : undefined,
      quizQuestions: Object.keys(quizQuestions).length ? quizQuestions : undefined,
    });
    if (r.kind === 'ok') {
      setStage('published');
      setHasUnsaved(false);
    }
  };

  const backToConfigure = () => {
    if (hasUnsaved && !confirm('Discard unsaved overrides and return to Configure?')) return;
    reset();
    setStage('configure');
    setBriefingHtml({});
    setQuizQuestions({});
    setHasUnsaved(false);
  };

  const startOver = () => {
    reset();
    setStage('configure');
    setBriefingHtml({});
    setQuizQuestions({});
    setHasUnsaved(false);
    setForm((f) => ({ ...f, workOrderId: '' }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin Dashboard
        </Link>
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-wide flex items-center gap-2">
              <Wrench className="h-7 w-7 text-primary" /> Course Builder
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generate SCORM courses from published Work Orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              scorm-build · v0.1
            </Badge>
            <StageBadge stage={stage} />
          </div>
        </header>

        {response?.kind === 'error' && <ErrorPanel response={response} />}

        {stage === 'configure' && (
          <ConfigureStage
            form={form}
            update={update}
            workOrders={workOrders}
            loadingWO={loadingWO}
            isBuilding={isBuilding}
            onPreview={onPreview}
          />
        )}

        {stage === 'preview' && response?.kind === 'preview' && (
          <PreviewStage
            response={response}
            briefingHtml={briefingHtml}
            quizQuestions={quizQuestions}
            onBriefingChange={(id, html) => {
              setBriefingHtml((m) => ({ ...m, [id]: html }));
              setHasUnsaved(true);
            }}
            onQuizChange={(id, qs) => {
              setQuizQuestions((m) => ({ ...m, [id]: qs }));
              setHasUnsaved(true);
            }}
            onRePreview={onPreview}
            onPublish={onPublish}
            onBack={backToConfigure}
            isBuilding={isBuilding}
            hasUnsaved={hasUnsaved}
          />
        )}

        {stage === 'published' && response?.kind === 'ok' && (
          <PublishedStage response={response} onStartOver={startOver} />
        )}
      </div>
    </AppLayout>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  const map: Record<Stage, { label: string; cls: string }> = {
    configure: { label: '1 · Configure', cls: 'bg-muted text-muted-foreground' },
    preview: { label: '2 · Preview', cls: 'bg-primary/20 text-primary border-primary/40' },
    published: { label: '3 · Published', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  };
  const { label, cls } = map[stage];
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

function ErrorPanel({ response }: { response: Extract<ScormBuildResponse, { kind: 'error' }> }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {response.code}
          </Badge>
          <span>{response.error}</span>
        </div>
        {response.issues && response.issues.length > 0 && (
          <ValidationSummary issues={response.issues} />
        )}
      </AlertDescription>
    </Alert>
  );
}

function ValidationSummary({ issues }: { issues: ValidationIssue[] }) {
  return (
    <div className="space-y-1 mt-2">
      <p className="text-xs uppercase tracking-wider opacity-80">
        Validation issues ({issues.length})
      </p>
      <ul className="space-y-1">
        {issues.map((i, idx) => (
          <li key={idx} className="text-xs flex items-start gap-2">
            <code className="font-mono opacity-70 shrink-0">{i.path}</code>
            <span className="opacity-80">·</span>
            <span>{i.message}</span>
            <Badge variant="outline" className="font-mono text-[10px] ml-auto shrink-0">
              {i.code}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Configure stage ----------
function ConfigureStage({
  form,
  update,
  workOrders,
  loadingWO,
  isBuilding,
  onPreview,
}: {
  form: ScormBuildRequest;
  update: <K extends keyof ScormBuildRequest>(k: K, v: ScormBuildRequest[K]) => void;
  workOrders: WorkOrder[];
  loadingWO: boolean;
  isBuilding: boolean;
  onPreview: () => void;
}) {
  return (
    <Card className="p-6 space-y-5 bg-card/50 backdrop-blur border-border">
      <div className="space-y-2">
        <Label>Source Work Order</Label>
        {loadingWO ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading work orders…
          </div>
        ) : (
          <Select
            value={form.workOrderId || 'none'}
            onValueChange={(v) => update('workOrderId', v === 'none' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a work order" />
            </SelectTrigger>
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
          <Select
            value={form.destination}
            onValueChange={(v) => update('destination', v as ScormBuildRequest['destination'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
          <Select
            value={form.brandMode}
            onValueChange={(v) => update('brandMode', v as ScormBuildRequest['brandMode'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arcade">Arcade</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>SCORM Version</Label>
          <Select
            value={form.scormVersion}
            onValueChange={(v) => update('scormVersion', v as ScormBuildRequest['scormVersion'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.2">SCORM 1.2</SelectItem>
              <SelectItem value="cmi5">cmi5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Title override (optional)</Label>
        <Input
          value={form.title ?? ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Derived from challenge if blank"
        />
      </div>

      <div className="space-y-2">
        <Label>Description override (optional)</Label>
        <Textarea
          value={form.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          AI Enhancement
        </Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="enhText"
            checked={!!form.enhanceText}
            onCheckedChange={(v) => update('enhanceText', !!v)}
          />
          <Label htmlFor="enhText" className="font-normal cursor-pointer">
            Rewrite description &amp; briefings (Anthropic)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="enhCover"
            checked={!!form.enhanceCover}
            onCheckedChange={(v) => update('enhanceCover', !!v)}
          />
          <Label htmlFor="enhCover" className="font-normal cursor-pointer">
            Regenerate cover image (OpenAI gpt-image-2)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Per-slot text/quiz overrides become editable in the Preview step.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={onPreview} disabled={!form.workOrderId || isBuilding}>
          {isBuilding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 mr-2" />
          )}
          {isBuilding ? 'Generating preview…' : 'Generate Preview'}
        </Button>
      </div>
    </Card>
  );
}

// ---------- Preview stage ----------
function PreviewStage({
  response,
  briefingHtml,
  quizQuestions,
  onBriefingChange,
  onQuizChange,
  onRePreview,
  onPublish,
  onBack,
  isBuilding,
  hasUnsaved,
}: {
  response: Extract<ScormBuildResponse, { kind: 'preview' }>;
  briefingHtml: Record<string, string>;
  quizQuestions: Record<string, QuizQuestion[]>;
  onBriefingChange: (id: string, html: string) => void;
  onQuizChange: (id: string, qs: QuizQuestion[]) => void;
  onRePreview: () => void;
  onPublish: () => void;
  onBack: () => void;
  isBuilding: boolean;
  hasUnsaved: boolean;
}) {
  const manifest = response.manifest;
  const cover = response.coverImageRemoteUrl || response.coverImageUrl;

  const briefingModules = useMemo(
    () => manifest.modules.filter((m): m is Extract<CourseModule, { type: 'briefing' }> => m.type === 'briefing'),
    [manifest]
  );
  const quizModules = useMemo(
    () => manifest.modules.filter((m): m is Extract<CourseModule, { type: 'quiz' }> => m.type === 'quiz'),
    [manifest]
  );

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-card/50 backdrop-blur border-border flex flex-wrap items-center gap-3 justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Configure
        </Button>
        <div className="flex items-center gap-2">
          {hasUnsaved && (
            <Badge variant="outline" className="text-amber-400 border-amber-500/40">
              Unsaved overrides
            </Badge>
          )}
          <Button variant="outline" onClick={onRePreview} disabled={isBuilding}>
            {isBuilding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Re-Preview
          </Button>
          <Button onClick={onPublish} disabled={isBuilding}>
            {isBuilding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur border-border space-y-3">
        <div className="flex items-center gap-4">
          {cover && (
            <img src={cover} alt="Course cover" className="w-32 h-32 rounded object-cover border border-border" />
          )}
          <div>
            <h2 className="text-xl font-display font-semibold">{manifest.title}</h2>
            {manifest.description && (
              <p className="text-sm text-muted-foreground mt-1">{manifest.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {manifest.modules.length} modules · SCORM {manifest.scormVersion}
              {manifest.pillar ? ` · ${manifest.pillar}` : ''}
            </p>
          </div>
        </div>
      </Card>

      {response.warnings.length > 0 && (
        <div className="space-y-2">
          {response.warnings.map((w, i) => (
            <Alert key={i} variant={w.level === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <Badge variant="outline" className="font-mono text-xs mr-2">
                  {w.code}
                </Badge>
                {w.message}
                {w.suggestion && (
                  <p className="mt-1 text-xs text-muted-foreground">→ {w.suggestion}</p>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {briefingModules.length === 0 && quizModules.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          This course has no editable briefing or quiz modules. Click <strong>Publish</strong> when
          ready.
        </Card>
      )}

      {briefingModules.map((m) => (
        <BriefingEditor
          key={m.id}
          module={m}
          value={briefingHtml[m.id] ?? m.html}
          onChange={(v) => onBriefingChange(m.id, v)}
        />
      ))}

      {quizModules.map((m) => (
        <QuizEditor
          key={m.id}
          module={m}
          value={quizQuestions[m.id] ?? m.questions}
          onChange={(qs) => onQuizChange(m.id, qs)}
        />
      ))}
    </div>
  );
}

function BriefingEditor({
  module,
  value,
  onChange,
}: {
  module: Extract<CourseModule, { type: 'briefing' }>;
  value: string;
  onChange: (html: string) => void;
}) {
  const sanitized = useMemo(() => sanitizeBriefing(value), [value]);
  return (
    <Card className="p-5 bg-card/50 backdrop-blur border-border space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Briefing · {module.title}</h3>
          <p className="text-xs text-muted-foreground font-mono">briefingHtml.{module.id}</p>
        </div>
        <Badge variant="outline" className="text-xs">briefing</Badge>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="font-mono text-xs"
        placeholder="<p>HTML…</p>"
      />
      <div className="text-xs text-muted-foreground">
        Allowed tags: <code className="font-mono">p, br, strong, em, ul, ol, li, h2, h3</code>.
        Sanitized client-side and server-side.
      </div>
      <div
        className="prose prose-invert prose-sm max-w-none p-3 rounded border border-border bg-background/40"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </Card>
  );
}

function QuizEditor({
  module,
  value,
  onChange,
}: {
  module: Extract<CourseModule, { type: 'quiz' }>;
  value: QuizQuestion[];
  onChange: (qs: QuizQuestion[]) => void;
}) {
  const addQuestion = () => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `q_${Math.random().toString(36).slice(2, 10)}`;
    onChange([
      ...value,
      {
        id,
        prompt: '',
        type: 'single-choice',
        choices: [
          { id: `${id}-a`, label: '', correct: true },
          { id: `${id}-b`, label: '', correct: false },
        ],
      },
    ]);
  };

  const updateQ = (qid: string, patch: Partial<QuizQuestion>) =>
    onChange(value.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  const removeQ = (qid: string) => onChange(value.filter((q) => q.id !== qid));
  const addChoice = (qid: string) =>
    updateQ(qid, {
      choices: [
        ...(value.find((q) => q.id === qid)?.choices ?? []),
        { id: `${qid}-${Math.random().toString(36).slice(2, 6)}`, label: '', correct: false },
      ],
    });

  return (
    <Card className="p-5 bg-card/50 backdrop-blur border-border space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Quiz · {module.title}</h3>
          <p className="text-xs text-muted-foreground font-mono">
            quizQuestions.{module.id} · pass ≥ {module.passThreshold}%
          </p>
        </div>
        <Badge variant="outline" className="text-xs">quiz</Badge>
      </div>

      {value.map((q, qi) => (
        <Card key={q.id} className="p-3 space-y-3 border-border/60">
          <div className="flex items-start gap-2">
            <span className="text-xs font-mono text-muted-foreground mt-2">Q{qi + 1}</span>
            <div className="flex-1 space-y-2">
              <Input
                value={q.prompt}
                onChange={(e) => updateQ(q.id, { prompt: e.target.value })}
                placeholder="Question prompt"
              />
              <Select
                value={q.type}
                onValueChange={(v) => updateQ(q.id, { type: v as QuizQuestion['type'] })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-choice">Single choice</SelectItem>
                  <SelectItem value="multi-choice">Multi choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="icon" variant="ghost" onClick={() => removeQ(q.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 pl-8">
            {q.choices.map((c, ci) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  checked={c.correct}
                  onCheckedChange={(checked) => {
                    const choices = q.choices.map((cc, cci) => {
                      if (q.type === 'single-choice' || q.type === 'true-false') {
                        return { ...cc, correct: cci === ci ? !!checked : false };
                      }
                      return cci === ci ? { ...cc, correct: !!checked } : cc;
                    });
                    updateQ(q.id, { choices });
                  }}
                />
                <Input
                  value={c.label}
                  onChange={(e) => {
                    const choices = q.choices.map((cc, cci) =>
                      cci === ci ? { ...cc, label: e.target.value } : cc
                    );
                    updateQ(q.id, { choices });
                  }}
                  placeholder={`Choice ${ci + 1}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    updateQ(q.id, { choices: q.choices.filter((_, i) => i !== ci) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => addChoice(q.id)}>
              <Plus className="h-3 w-3 mr-1" /> Add choice
            </Button>
          </div>

          <Textarea
            value={q.explanation ?? ''}
            onChange={(e) => updateQ(q.id, { explanation: e.target.value || undefined })}
            placeholder="Optional explanation shown after answering"
            rows={2}
            className="text-sm"
          />
        </Card>
      ))}

      <Button variant="outline" onClick={addQuestion}>
        <Plus className="h-4 w-4 mr-2" /> Add Question
      </Button>
    </Card>
  );
}

// ---------- Published stage ----------
function PublishedStage({
  response,
  onStartOver,
}: {
  response: Extract<ScormBuildResponse, { kind: 'ok' }>;
  onStartOver: () => void;
}) {
  return (
    <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-primary/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="h-5 w-5" />
          <h3 className="font-display font-semibold text-lg">
            {response.isReplacement ? 'Course replaced' : 'Course built'}: {response.title}
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={onStartOver}>
          Start Another
        </Button>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Course ID</dt>
          <dd className="font-mono text-xs break-all">{response.courseId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Manifest</dt>
          <dd>
            <a
              className="text-primary hover:underline break-all"
              href={response.manifestUrl}
              target="_blank"
              rel="noreferrer"
            >
              course.json <ExternalLink className="inline h-3 w-3" />
            </a>
          </dd>
        </div>
        {response.zipUrl && (
          <div>
            <dt className="text-muted-foreground">SCORM ZIP</dt>
            <dd>
              <a
                className="text-primary hover:underline"
                href={response.zipUrl}
                target="_blank"
                rel="noreferrer"
              >
                Download <ExternalLink className="inline h-3 w-3" />
              </a>
            </dd>
          </div>
        )}
        {response.playerUrl && (
          <div>
            <dt className="text-muted-foreground">Native Player</dt>
            <dd>
              <Button asChild size="sm" variant="default">
                <Link to={`/scorm-player/${response.courseId}/launch`}>Open in Player</Link>
              </Button>
            </dd>
          </div>
        )}
      </dl>

      {response.warnings.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Warnings ({response.warnings.length})
          </p>
          {response.warnings.map((w, i) => (
            <Alert key={i} variant={w.level === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {w.code}
                  </Badge>
                  <span className="text-xs uppercase">{w.level}</span>
                </div>
                <p className="mt-1">{w.message}</p>
                {w.suggestion && (
                  <p className="mt-1 text-xs text-muted-foreground">→ {w.suggestion}</p>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </Card>
  );
}
