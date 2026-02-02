import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePendingEvidenceCount() {
  return useQuery({
    queryKey: ['pending-evidence-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('work_order_evidence')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
