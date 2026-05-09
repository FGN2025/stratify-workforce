import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CourseManifest, QuizQuestion } from '@/lib/scorm-player/types';

export interface ScormBuildRequest {
  /** Single-WO path (back-compat). Mutually exclusive with workOrderIds. */
  workOrderId?: string;
  /** Bundle path: 2–10 WO ids. Index 0 is the lead. Mutually exclusive with workOrderId. */
  workOrderIds?: string[];
  destination: 'fgn-academy' | 'broadband-workforce' | 'simu-cdl-path' | 'external-lms';
  brandMode: 'arcade' | 'enterprise';
  scormVersion?: '1.2' | 'cmi5';
  title?: string;
  description?: string;
  enhanceText?: boolean;
  enhanceCover?: boolean;
  /** v0.1: when true, scorm-build returns a preview manifest without persisting. */
  dryRun?: boolean;
  /** v0.1: per-briefing-module HTML overrides (sanitized server-side). */
  briefingHtml?: Record<string, string>;
  /** v0.1: per-quiz-module question overrides; new questions need crypto.randomUUID() ids. */
  quizQuestions?: Record<string, QuizQuestion[]>;
}

export interface ScormBuildWarning {
  level: 'info' | 'warn' | 'error';
  code: string;
  message: string;
  suggestion?: string;
}

/** v0.1 OVERRIDE_VALIDATION issue. */
export interface ValidationIssue {
  path: string; // JSONPath-ish: briefingHtml.<id>, quizQuestions.<id>[i].id, ...
  code: string;
  message: string;
  severity?: 'error' | 'warning';
}

/** Discriminated response from scorm-build v0.1. */
export type ScormBuildResponse =
  | {
      kind: 'preview';
      status: 'preview';
      manifest: CourseManifest;
      coverImageUrl: string | null;
      coverImageRemoteUrl?: string | null;
      title: string;
      warnings: ScormBuildWarning[];
    }
  | {
      kind: 'ok';
      status: string;
      courseId: string;
      manifestUrl: string;
      zipUrl: string | null;
      playerUrl: string | null;
      /** Lead WO URL (back-compat alias for leadWorkOrderUrl). */
      workOrderUrl: string;
      /** v0.2: lead WO URL, always present. */
      leadWorkOrderUrl?: string;
      /** v0.2: mirrors workOrderIds[] exactly (lead at [0]). Single-WO builds: [workOrderUrl]. */
      workOrderUrls?: string[];
      coverImageUrl: string | null;
      title: string;
      isReplacement: boolean;
      warnings: ScormBuildWarning[];
      manifest?: CourseManifest;
    }
  | {
      kind: 'error';
      code: string;
      error: string;
      issues?: ValidationIssue[];
    };

// Server-side filtered codes; we mirror them client-side as defense-in-depth.
const SUPPRESSED_WARNING_CODES = new Set(['QUIZ_PLACEHOLDER_NEEDS_AUTHORING', 'ENHANCER_NO_OUTPUT']);

function filterWarnings(ws: ScormBuildWarning[] | undefined): ScormBuildWarning[] {
  return (ws ?? []).filter((w) => !SUPPRESSED_WARNING_CODES.has(w.code));
}

function classify(data: unknown): ScormBuildResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (d?.error) {
    return {
      kind: 'error',
      code: d.code ?? 'UNKNOWN',
      error: typeof d.error === 'string' ? d.error : 'Build failed',
      issues: Array.isArray(d.issues) ? (d.issues as ValidationIssue[]) : undefined,
    };
  }
  if (d?.status === 'preview') {
    return {
      kind: 'preview',
      status: 'preview',
      manifest: d.manifest as CourseManifest,
      coverImageUrl: d.coverImageUrl ?? d.manifest?.coverImageUrl ?? null,
      coverImageRemoteUrl: d.coverImageRemoteUrl ?? d.manifest?.coverImageRemoteUrl ?? null,
      title: d.title ?? d.manifest?.title ?? 'Untitled',
      warnings: filterWarnings(d.warnings),
    };
  }
  return {
    kind: 'ok',
    status: d.status ?? 'ok',
    courseId: d.courseId,
    manifestUrl: d.manifestUrl,
    zipUrl: d.zipUrl ?? null,
    playerUrl: d.playerUrl ?? null,
    workOrderUrl: d.workOrderUrl,
    coverImageUrl: d.coverImageUrl ?? null,
    title: d.title,
    isReplacement: !!d.isReplacement,
    warnings: filterWarnings(d.warnings),
    manifest: d.manifest as CourseManifest | undefined,
  };
}

export function useScormBuild() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [response, setResponse] = useState<ScormBuildResponse | null>(null);

  const build = async (req: ScormBuildRequest): Promise<ScormBuildResponse> => {
    setIsBuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('scorm-build', { body: req });
      if (error) {
        // Try to surface validation issues from the function's 4xx body if present.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (error as any).context;
        let payload: unknown = data;
        if (!payload && ctx?.text) {
          try { payload = JSON.parse(await ctx.text()); } catch { /* noop */ }
        }
        if (payload && typeof payload === 'object') {
          const r = classify(payload);
          setResponse(r);
          return r;
        }
        const r: ScormBuildResponse = { kind: 'error', code: 'INVOKE_ERROR', error: error.message };
        setResponse(r);
        return r;
      }
      const r = classify(data);
      setResponse(r);
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const r: ScormBuildResponse = { kind: 'error', code: 'CLIENT_ERROR', error: msg };
      setResponse(r);
      return r;
    } finally {
      setIsBuilding(false);
    }
  };

  return {
    build,
    isBuilding,
    response,
    reset: () => setResponse(null),
  };
}

// Re-export for consumers
export type { CourseManifest, QuizQuestion };
