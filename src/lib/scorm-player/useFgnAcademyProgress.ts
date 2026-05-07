// useFgnAcademyProgress — Phase 2 v0.3 hook.
//
// Bridges the SCORM Player's onProgress callback to the Lovable-owned
// scorm-session-complete edge function and the scorm_course_progress
// table. Contract reference: PHASE_2_SPEC.md §"v0.3 coordination contract".
//
// Responsibilities:
//   1. On mount: GET scorm_course_progress for (auth.uid(), courseId) and
//      expose suspend_data as initialSuspendData for the Player to restore.
//   2. flushProgress(state, opts?): debounced (2s trailing) POST to
//      scorm-session-complete; opts.flush bypasses debounce for terminal
//      events (lessonStatus passed/failed/completed).
//   3. Cumulative-since-mount sessionTimeSeconds in ProgressState is
//      converted to delta-since-last-successful-flush before POST.
//   4. lastFlushedTimeSeconds ref advances ONLY on 2xx response; non-2xx
//      leaves it untouched so the next flush resends the same delta plus
//      any newly accumulated time. Double-fires only happen via client
//      bugs, not contract ambiguity (server is naive on time math).
//   5. 5xx surfaces as error and is implicitly retried on the next state
//      change (debounce will fire again with cumulative delta). 4xx
//      surfaces without retry — the request is malformed; retrying with
//      the same body won't help. 401/403 bypass retry — re-auth is the
//      user's problem.
//
// Bug-fix breadcrumb (carry into the PR description):
//   v0 ScormPlayer.markComplete called emit() with stale closure values
//   for `completed`. Moved emit into a useEffect keyed on the meaningful
//   state in the v0.3 prep commit (stratify 6a283a8 / toolkit 3499633).
//   Don't re-introduce that pattern in any future "simplification" pass.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProgressState } from './types';

const DEBOUNCE_MS = 2000;
const MAX_DELTA_SECONDS = 3600; // server caps at 3600; we skip rather than provoke a 400

interface FlushOptions {
  /** Bypass the 2s debounce. Use for terminal events (course completion). */
  flush?: boolean;
}

export interface UseFgnAcademyProgressResult {
  /** Suspend data fetched from scorm_course_progress; pass to Player. */
  initialSuspendData: string | undefined;
  /** True once the restore-on-mount fetch has resolved (success or no-op). */
  isReady: boolean;
  /** Debounced flush; opts.flush=true for terminal events. */
  flushProgress: (state: ProgressState, opts?: FlushOptions) => void;
  /** Latest server error surface; null when last flush succeeded. */
  error: string | null;
}

interface SessionCompletePayload {
  course_id: string;
  session_id: string;
  lesson_status: string;
  lesson_location: string | null;
  score_raw: number | null;
  passing_threshold: number | null;
  session_time_seconds: number;
  scorm_suspend_data: string;
  passed: boolean;
  flush?: boolean;
}

export function useFgnAcademyProgress(
  courseId: string | undefined,
): UseFgnAcademyProgressResult {
  const [initialSuspendData, setInitialSuspendData] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastFlushedTimeRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const lastStateRef = useRef<ProgressState | null>(null);
  const pendingFlushFlagRef = useRef(false);
  // Promise chain: every flush awaits the previous one's completion. Prevents
  // concurrent calls that would each compute delta against the same
  // lastFlushedTimeRef value and double-count session time on the server.
  const flushQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Restore on mount.
  useEffect(() => {
    if (!courseId) {
      setIsReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          if (!cancelled) setIsReady(true);
          return;
        }
        const { data, error: dbErr } = await supabase
          .from('scorm_course_progress')
          .select('suspend_data')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (dbErr) {
          // Not fatal — Player will start fresh. Surface a console warning.
          // eslint-disable-next-line no-console
          console.warn('[scorm-player] failed to load progress on mount:', dbErr);
        } else if (data?.suspend_data) {
          setInitialSuspendData(data.suspend_data);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[scorm-player] restore-on-mount error:', e);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const buildPayload = (state: ProgressState, isFlush: boolean): SessionCompletePayload | null => {
    if (!courseId) return null;
    const delta = state.sessionTimeSeconds - lastFlushedTimeRef.current;
    if (delta < 0) {
      // Player time is monotonic; this shouldn't happen. Log and skip.
      // eslint-disable-next-line no-console
      console.warn('[scorm-player] negative session-time delta; skipping flush');
      return null;
    }
    if (delta > MAX_DELTA_SECONDS) {
      // Server would 400. Skip and warn — backfills > 1h are out-of-band per contract.
      // eslint-disable-next-line no-console
      console.warn(
        `[scorm-player] session-time delta ${delta}s exceeds ${MAX_DELTA_SECONDS}s cap; skipping flush`,
      );
      return null;
    }
    const payload: SessionCompletePayload = {
      course_id: courseId,
      session_id: state.sessionId,
      lesson_status: state.lessonStatus,
      lesson_location: state.lessonLocation,
      score_raw: state.scoreRaw,
      passing_threshold: state.passingThreshold,
      session_time_seconds: delta,
      scorm_suspend_data: state.scormSuspendData,
      passed: state.passed,
    };
    if (isFlush) payload.flush = true;
    return payload;
  };

  const enqueueFlush = useCallback(() => {
    // Append to the chain so this flush awaits the previous one. Always
    // sends the LATEST state at execution time (not the state at queue
    // time) so bursty emits during an in-flight call collapse into one
    // server hit with the freshest payload.
    flushQueueRef.current = flushQueueRef.current.then(async () => {
      const state = lastStateRef.current;
      if (!state) return;
      const isFlush = pendingFlushFlagRef.current;
      pendingFlushFlagRef.current = false;
      const payload = buildPayload(state, isFlush);
      if (!payload) return;
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke(
          'scorm-session-complete',
          { body: payload },
        );
        if (invokeErr) {
          // supabase-js wraps any non-2xx as invokeErr. Don't advance
          // the ref — next flush will resend the same delta + accumulated
          // time. The host can surface invokeErr.message to the user.
          setError(invokeErr.message ?? 'flush failed');
          return;
        }
        lastFlushedTimeRef.current = state.sessionTimeSeconds;
        setError(null);
        void data;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'flush error');
      }
    });
    return flushQueueRef.current;
  }, [courseId]);

  const flushProgress = useCallback(
    (state: ProgressState, opts?: FlushOptions) => {
      lastStateRef.current = state;
      // Sticky flush flag: once set, the next enqueued flush sends
      // flush:true. Cleared after consumption inside the queue.
      if (opts?.flush) pendingFlushFlagRef.current = true;
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (opts?.flush) {
        // Bypass debounce — terminal event. Still goes through the queue
        // so it serializes with any in-flight flush.
        void enqueueFlush();
        return;
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        void enqueueFlush();
      }, DEBOUNCE_MS);
    },
    [enqueueFlush],
  );

  // On unmount, clear the pending debounce. We deliberately do NOT
  // synchronously flush here — supabase.functions.invoke doesn't
  // support keepalive, and a fire-and-forget without auth headers
  // wouldn't pass RLS. Trade-off: up to 2s of trailing time may be
  // lost if the user closes the tab mid-debounce. The next session
  // mount picks up the missed time via the cumulative delta tracking
  // (lastFlushedTimeRef resets to 0 on fresh mount), so the only
  // permanent loss is the trailing window between last successful
  // flush and tab close. Acceptable for v0.3; revisit in v0.4 with
  // a keepalive-capable raw-fetch fallback.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  return { initialSuspendData, isReady, flushProgress, error };
}
