import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePendingCommunityCount() {
  return useQuery({
    queryKey: ['pending-community-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
