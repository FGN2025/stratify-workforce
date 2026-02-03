import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tenant } from '@/types/tenant';

export function useCommunities() {
  const queryClient = useQueryClient();

  const { data: communities = [], isLoading, error } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name', { ascending: true });

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
