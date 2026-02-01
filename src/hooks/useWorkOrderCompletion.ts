import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type CompletionStatus = Database['public']['Enums']['completion_status'];
type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];

export interface WorkOrderCompletion {
  id: string;
  user_id: string;
  work_order_id: string;
  status: CompletionStatus;
  score: number | null;
  xp_awarded: number;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

// XP calculation logic
export function calculateWorkOrderXP({
  baseXP,
  score,
  isFirstAttempt,
  difficulty,
}: {
  baseXP: number;
  score?: number;
  isFirstAttempt?: boolean;
  difficulty?: WorkOrderDifficulty;
}): number {
  // Score multiplier
  let scoreMultiplier = 1.0;
  if (score !== undefined) {
    if (score >= 90) scoreMultiplier = 1.5;
    else if (score >= 80) scoreMultiplier = 1.2;
  }

  // First completion bonus
  const firstCompletionBonus = isFirstAttempt ? 1.25 : 1.0;

  // Difficulty bonus
  const difficultyMultipliers: Record<WorkOrderDifficulty, number> = {
    beginner: 1.0,
    intermediate: 1.2,
    advanced: 1.5,
  };
  const difficultyBonus = difficulty ? difficultyMultipliers[difficulty] : 1.0;

  return Math.round(baseXP * scoreMultiplier * firstCompletionBonus * difficultyBonus);
}

export function useWorkOrderCompletions(workOrderId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['work-order-completions', user?.id, workOrderId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('user_work_order_completions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (workOrderId) {
        query = query.eq('work_order_id', workOrderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        work_order_id: c.work_order_id,
        status: c.status,
        score: c.score,
        xp_awarded: c.xp_awarded,
        attempt_number: c.attempt_number,
        started_at: c.started_at,
        completed_at: c.completed_at,
        metadata: (c.metadata as Record<string, unknown>) || {},
      })) as WorkOrderCompletion[];
    },
  });
}

export function useStartWorkOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Get current attempt count
      const { count } = await supabase
        .from('user_work_order_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('work_order_id', workOrderId);

      const attemptNumber = (count || 0) + 1;

      const { data, error } = await supabase
        .from('user_work_order_completions')
        .insert({
          user_id: user.id,
          work_order_id: workOrderId,
          status: 'in_progress',
          attempt_number: attemptNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, workOrderId) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-completions', user?.id, workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-order-completions', user?.id, undefined] });
    },
  });
}

export function useCompleteWorkOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      completionId,
      score,
      xpAwarded,
      status = 'completed',
      metadata,
    }: {
      completionId: string;
      score: number;
      xpAwarded: number;
      status?: 'completed' | 'failed';
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Update the completion record
      const { data: completion, error: completionError } = await supabase
        .from('user_work_order_completions')
        .update({
          status,
          score,
          xp_awarded: status === 'completed' ? xpAwarded : 0,
          completed_at: new Date().toISOString(),
          metadata: (metadata || {}) as unknown as Record<string, never>,
        })
        .eq('id', completionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (completionError) throw completionError;

      // Award XP if completed successfully
      if (status === 'completed' && xpAwarded > 0) {
        const { error: pointsError } = await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points_type: 'xp',
            amount: xpAwarded,
            source_type: 'work_order',
            source_id: completion.work_order_id,
            description: `Completed work order`,
          });

        if (pointsError) throw pointsError;
      }

      return { completion, xpAwarded };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-completions'] });
      queryClient.invalidateQueries({ queryKey: ['user-xp', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-points', user?.id] });
    },
  });
}

export function useUserWorkOrderStatus(workOrderId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['work-order-status', user?.id, workOrderId],
    enabled: !!user && !!workOrderId,
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_work_order_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_order_id', workOrderId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const latest = data?.[0];
      if (!latest) return { hasAttempted: false, latestStatus: null, attemptCount: 0 };

      // Get total count
      const { count } = await supabase
        .from('user_work_order_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('work_order_id', workOrderId);

      return {
        hasAttempted: true,
        latestStatus: latest.status as CompletionStatus,
        latestScore: latest.score,
        attemptCount: count || 0,
        isCompleted: latest.status === 'completed',
        bestScore: latest.score, // TODO: Track best score
      };
    },
  });
}
