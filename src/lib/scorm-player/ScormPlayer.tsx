// Vendored from fgn-scorm-toolkit packages/scorm-player (v0 minimal port).
// Phase 2 v0: presentation-only. reportProgress() is wired by the host
// (ScormPlayerLaunch) and is a no-op until v0.3 ships scorm-session-complete.

import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ExternalLink, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { CourseManifest, CourseModule, ProgressState, QuizQuestion } from './types';

interface Props {
  manifest: CourseManifest;
  manifestBaseUrl: string;
  onProgress?: (state: ProgressState) => void;
  onFinish?: () => void;
  finishCta?: { label: string; href: string } | null;
}

function resolveAssetUrl(baseUrl: string, relative: string): string {
  if (/^https?:/.test(relative)) return relative;
  try {
    return new URL(relative, baseUrl).toString();
  } catch {
    return relative;
  }
}

export function ScormPlayer({ manifest, manifestBaseUrl, onProgress, onFinish, finishCta }: Props) {
  const modules = manifest.modules;
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [quizState, setQuizState] = useState<Record<string, { score: number; passed: boolean }>>({});
  const [showFinish, setShowFinish] = useState(false);

  const current = modules[index];
  const allDone = completed.size >= modules.length;
  const pct = useMemo(
    () => Math.round((completed.size / Math.max(modules.length, 1)) * 100),
    [completed, modules.length],
  );

  const coverUrl = manifest.coverImageUrl
    ? resolveAssetUrl(manifestBaseUrl, manifest.coverImageUrl)
    : manifest.coverImageRemoteUrl ?? null;

  const emit = (next: Partial<ProgressState> = {}) => {
    const state: ProgressState = {
      currentModuleId: current?.id ?? null,
      completedModuleIds: Array.from(completed),
      quizScores: quizState,
      status: completed.size >= modules.length ? 'passed' : 'in_progress',
      ...next,
    };
    onProgress?.(state);
  };

  const markComplete = (mod: CourseModule) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(mod.id);
      return next;
    });
    emit();
  };

  const goNext = () => {
    if (current) markComplete(current);
    if (index < modules.length - 1) {
      setIndex(index + 1);
    } else {
      setShowFinish(true);
      onFinish?.();
    }
  };
  const goPrev = () => index > 0 && setIndex(index - 1);

  if (!current) {
    return <div className="p-8 text-muted-foreground">No modules in this course.</div>;
  }

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {coverUrl && (
        <div className="relative rounded-lg overflow-hidden border border-border h-40">
          <img src={coverUrl} alt={`${manifest.title} cover`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-2xl font-display font-bold tracking-wide text-foreground">{manifest.title}</h2>
            {manifest.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{manifest.description}</p>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {!coverUrl && <h2 className="text-xl font-display font-bold tracking-wide">{manifest.title}</h2>}
          <p className="text-xs text-muted-foreground font-mono">
            Module {index + 1} of {modules.length} · {current.type}
          </p>
        </div>
        <div className="w-48">
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground mt-1 text-right font-mono">{pct}%</p>
        </div>
      </div>

      <Card className="flex-1 p-6 overflow-auto bg-card/50 backdrop-blur border-border">
        <h3 className="text-lg font-display font-semibold mb-4">{current.title}</h3>
        <ModuleBody module={current} baseUrl={manifestBaseUrl} onComplete={() => markComplete(current)}
          onQuizResult={(score, passed) => {
            setQuizState((q) => ({ ...q, [current.id]: { score, passed } }));
            if (passed) markComplete(current);
          }}
        />
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={goPrev} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="text-xs text-muted-foreground font-mono">
          {completed.has(current.id) && (
            <span className="text-primary inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </span>
          )}
        </div>
        <Button onClick={goNext}>
          {index < modules.length - 1 ? 'Next' : 'Finish'} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {showFinish && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm rounded-lg">
          <Card className="max-w-md w-full mx-4 p-8 text-center border-primary/40 bg-card">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">Course Complete</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You finished all {modules.length} modules of <span className="text-foreground font-medium">{manifest.title}</span>.
              {allDone ? '' : ' Some modules were skipped — revisit them anytime.'}
            </p>
            <div className="flex flex-col gap-2">
              {finishCta && (
                <Button asChild size="lg">
                  <a href={finishCta.href}>{finishCta.label}</a>
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowFinish(false)}>
                Review Modules
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ModuleBody({
  module: mod,
  baseUrl,
  onComplete,
  onQuizResult,
}: {
  module: CourseModule;
  baseUrl: string;
  onComplete: () => void;
  onQuizResult: (score: number, passed: boolean) => void;
}) {
  switch (mod.type) {
    case 'briefing':
    case 'completion':
      return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: mod.html }} />;
    case 'media':
      return (
        <div>
          {mod.mediaUrl.match(/\.(mp4|webm)/i) ? (
            <video controls className="w-full rounded" src={resolveAssetUrl(baseUrl, mod.mediaUrl)} />
          ) : (
            <img src={resolveAssetUrl(baseUrl, mod.mediaUrl)} alt={mod.title} className="w-full rounded" />
          )}
          {mod.caption && <p className="text-sm text-muted-foreground mt-2">{mod.caption}</p>}
        </div>
      );
    case 'challenge':
      return (
        <div className="space-y-4">
          {mod.preLaunchHtml && (
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: mod.preLaunchHtml }} />
          )}
          <div>
            <h4 className="font-semibold mb-2">Tasks</h4>
            <ol className="space-y-2 list-decimal list-inside">
              {mod.tasks.map((t) => (
                <li key={t.id} className="text-sm">
                  <span className="font-medium">{t.title}</span>
                  <p className="text-muted-foreground text-xs mt-1 ml-5">{t.description}</p>
                </li>
              ))}
            </ol>
          </div>
          <Button asChild variant="default">
            <a href={mod.challengeUrl} target="_blank" rel="noreferrer">
              Launch Challenge <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </Button>
          <Button variant="outline" onClick={onComplete} className="ml-2">
            Mark as completed
          </Button>
        </div>
      );
    case 'quiz':
      return <QuizModuleBody questions={mod.questions} threshold={mod.passThreshold} onResult={onQuizResult} />;
  }
}

function QuizModuleBody({
  questions,
  threshold,
  onResult,
}: {
  questions: QuizQuestion[];
  threshold: number;
  onResult: (score: number, passed: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const submit = () => {
    let correct = 0;
    for (const q of questions) {
      const selected = answers[q.id] ?? new Set();
      const correctIds = new Set(q.choices.filter((c) => c.correct).map((c) => c.id));
      const ok = selected.size === correctIds.size && Array.from(selected).every((id) => correctIds.has(id));
      if (ok) correct++;
    }
    const pct = Math.round((correct / questions.length) * 100);
    const passed = pct >= threshold;
    setScore(pct);
    setSubmitted(true);
    onResult(pct, passed);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="font-medium">
            {i + 1}. {q.prompt}
          </p>
          <div className="space-y-1">
            {q.choices.map((c) => {
              const selected = answers[q.id]?.has(c.id) ?? false;
              return (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type={q.type === 'multi-choice' ? 'checkbox' : 'radio'}
                    name={q.id}
                    checked={selected}
                    disabled={submitted}
                    onChange={() => {
                      setAnswers((prev) => {
                        const next = { ...prev };
                        if (q.type === 'multi-choice') {
                          const set = new Set(next[q.id] ?? []);
                          if (selected) set.delete(c.id);
                          else set.add(c.id);
                          next[q.id] = set;
                        } else {
                          next[q.id] = new Set([c.id]);
                        }
                        return next;
                      });
                    }}
                  />
                  <span className={submitted && c.correct ? 'text-primary' : ''}>{c.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <Button onClick={submit}>Submit Quiz</Button>
      ) : (
        <div className="text-sm">
          Score: <span className="font-mono">{score}%</span> ·{' '}
          {score >= threshold ? (
            <span className="text-primary">Passed</span>
          ) : (
            <span className="text-destructive">Did not meet {threshold}% threshold</span>
          )}
        </div>
      )}
    </div>
  );
}
