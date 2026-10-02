import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkOrderTask {
  id: string;
  work_order_id: string;
  title: string;
  description: string | null;
  order_index: number;
  source_task_id: string | null;
  created_at: string;
}

export interface UserTaskProgress {
  id: string;
  user_id: string;
  work_order_task_id: string;
  work_order_id: string;
  is_completed: boolean;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export function useWorkOrderTasks(workOrderId?: string) {
  return useQuery({
    queryKey: ['work-order-tasks', workOrderId],
    enabled: !!workOrderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_tasks')
        .select('*')
        .eq('work_order_id', workOrderId!)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as WorkOrderTask[];
    },
  });
}

export function useUserTaskProgress(workOrderId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-task-progress', user?.id, workOrderId],
    enabled: !!user && !!workOrderId,
    queryFn: async () => {
      if (!user) return [];

      const [{ data, error }, demosRes] = await Promise.all([
        supabase
          .from('user_task_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('work_order_id', workOrderId!),
        // Steps a reviewer accepted count as completed too.
        supabase
          .from('task_demonstrations')
          .select('id, task_id, review_completed_at')
          .eq('user_id', user.id)
          .eq('work_order_id', workOrderId!)
          .eq('status', 'demonstrated'),
      ]);

      if (error) throw error;
      const rows = (data || []).map(d => ({
        ...d,
        metadata: (d.metadata as Record<string, unknown>) || {},
      })) as UserTaskProgress[];
      for (const demo of demosRes.data ?? []) {
        const existing = rows.find(r => r.work_order_task_id === demo.task_id);
        if (existing) {
          if (!existing.is_completed) {
            existing.is_completed = true;
            existing.completed_at = demo.review_completed_at;
          }
        } else {
          rows.push({
            id: demo.id,
            user_id: user.id,
            work_order_task_id: demo.task_id,
            work_order_id: workOrderId!,
            is_completed: true,
            completed_at: demo.review_completed_at,
            metadata: { source: 'reviewed_demonstration' },
          });
        }
      }
      return rows;
    },
  });
}
