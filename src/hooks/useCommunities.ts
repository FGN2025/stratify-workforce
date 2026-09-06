import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types/tenant';

export function useCommunities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: communities = [], isLoading, error } = useQuery({
    queryKey: ['communities', user?.id ? 'auth' : 'anon'],
    queryFn: async () => {
      // Signed-out visitors read the safe public projection (no owner/review/integration fields).
      const query = user
        ? supabase.from('tenants').select('*').eq('approval_status', 'approved')
        : supabase.from('public_communities').select('*');

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as Tenant[];
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['communities'] });
  };

  return {
    communities,
    isLoading,
    error,
    refetch,
  };
}
