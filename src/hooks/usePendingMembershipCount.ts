import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePendingMembershipCount(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['pending-membership-count', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('community_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .eq('request_status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
}
