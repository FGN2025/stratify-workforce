import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface WorkOrderAssignment {
  id: string;
  tenant_id: string;
  work_order_id: string;
  user_id: string | null;
  assigned_by: string;
  assigned_at: string;
  notes: string | null;
}

export function useWorkOrderAssignments(tenantId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['work-order-assignments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('work_order_assignments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as WorkOrderAssignment[];
    },
    enabled: !!tenantId && !!user,
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      workOrderId,
      userId,
      notes,
    }: {
      workOrderId: string;
      userId?: string;
      notes?: string;
    }) => {
      if (!tenantId || !user) throw new Error('Missing context');
      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        work_order_id: workOrderId,
        assigned_by: user.id,
        notes: notes || null,
      };
      if (userId) row.user_id = userId;
      const { error } = await supabase.from('work_order_assignments').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments', tenantId] });
      toast({ title: 'Work Order assigned', description: 'Assignment saved successfully.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Assignment failed', description: err.message, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('work_order_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments', tenantId] });
      toast({ title: 'Assignment removed' });
    },
    onError: (err: Error) => {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
    },
  });

  const communityAssignments = assignments.filter(a => a.user_id === null);
  const memberAssignments = assignments.filter(a => a.user_id !== null);

  return {
    assignments,
    communityAssignments,
    memberAssignments,
    isLoading,
    assign: assignMutation.mutate,
    remove: removeMutation.mutate,
    isAssigning: assignMutation.isPending,
  };
}
