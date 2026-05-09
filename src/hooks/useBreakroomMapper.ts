import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BreakroomSyncAttempt {
  id: string;
  breakroom_quiz_id: number;
  breakroom_user_id: number;
  fgn_user_id: string;
  sync_outcome: 'completed' | 'no_matching_work_order' | 'sync_error';
  fgn_result: string | null;
  bbw_result: string | null;
  attempt_count: number;
  last_attempt_at: string;
  metadata: {
    quiz_name?: string;
    breakroom_course_id?: number;
    breakroom_course_name?: string;
    completion_date?: string;
  } | null;
  fgn_username?: string | null;
}

export interface WorkOrderOption {
  id: string;
  title: string;
  game_title: string | null;
  source_challenge_id: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Lists every Breakroom sync attempt with the linked profile username.
 * Filtered admin-side so unmapped rows surface first.
 */
export function useBreakroomSyncAttempts() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['breakroom-sync-attempts', session?.access_token],
    enabled: !!session?.access_token,
    queryFn: async (): Promise<BreakroomSyncAttempt[]> => {
      const { data, error } = await supabase
        .from('breakroom_sync_attempts')
        .select('*')
        .order('last_attempt_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map(r => r.fgn_user_id))];
      const profileMap = new Map<string, string | null>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        (profiles ?? []).forEach(p => profileMap.set(p.id, p.username));
      }

      return (data ?? []).map(r => ({
        ...(r as unknown as BreakroomSyncAttempt),
        fgn_username: profileMap.get(r.fgn_user_id) ?? null,
      }));
    },
  });
}

/** Active work orders for the picker. */
export function useWorkOrderOptions() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['work-order-options-mapper', session?.access_token],
    enabled: !!session?.access_token,
    queryFn: async (): Promise<WorkOrderOption[]> => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, title, game_title, source_challenge_id, metadata')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return (data ?? []) as WorkOrderOption[];
    },
  });
}

interface MapAndResyncArgs {
  attempt: BreakroomSyncAttempt;
  workOrderId: string;
}

/**
 * 1. Patches the chosen work_order's metadata.breakroom_course_name to match
 *    the Breakroom quiz name (and course name as a fallback).
 * 2. Deletes the breakroom_sync_attempts row so the next poll retries it.
 * 3. Invokes breakroom-lms-poll immediately to fan-out the sync.
 */
export function useMapAndResync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ attempt, workOrderId }: MapAndResyncArgs) => {
      const quizName = attempt.metadata?.quiz_name;
      const courseName = attempt.metadata?.breakroom_course_name;
      if (!quizName) throw new Error('Attempt is missing quiz_name in metadata');

      // Read current metadata so we don't clobber other keys
      const { data: wo, error: woReadErr } = await supabase
        .from('work_orders')
        .select('id, metadata')
        .eq('id', workOrderId)
        .single();
      if (woReadErr) throw woReadErr;

      const nextMeta = {
        ...((wo?.metadata as Record<string, unknown> | null) ?? {}),
        breakroom_course_name: quizName,
        ...(courseName ? { breakroom_course_name_alt: courseName } : {}),
      };

      const { error: woUpdateErr } = await supabase
        .from('work_orders')
        .update({ metadata: nextMeta })
        .eq('id', workOrderId);
      if (woUpdateErr) throw woUpdateErr;

      // Reset the attempt so the poll will retry
      const { error: delErr } = await supabase
        .from('breakroom_sync_attempts')
        .delete()
        .eq('id', attempt.id);
      if (delErr) throw delErr;

      // Trigger an immediate poll
      const { data: pollData, error: pollErr } = await supabase.functions.invoke(
        'breakroom-lms-poll',
        { body: {} }
      );
      if (pollErr) throw pollErr;

      return pollData as { success: boolean; results: Record<string, unknown> };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breakroom-sync-attempts'] });
      qc.invalidateQueries({ queryKey: ['work-order-options-mapper'] });
    },
  });
}

/** Just delete the attempt (manual reset without changing a WO). */
export function useResetAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attemptId: string) => {
      const { error } = await supabase
        .from('breakroom_sync_attempts')
        .delete()
        .eq('id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breakroom-sync-attempts'] });
    },
  });
}

/** Run the poll immediately (for the "Poll now" button). */
export function useTriggerPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('breakroom-lms-poll', {
        body: {},
      });
      if (error) throw error;
      return data as { success: boolean; results: Record<string, unknown> };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breakroom-sync-attempts'] });
    },
  });
}
