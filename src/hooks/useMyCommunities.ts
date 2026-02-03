import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types/tenant';

export function useMyCommunities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: myCommunities = [], isLoading, error } = useQuery({
    queryKey: ['my-communities', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Tenant[];
    },
    enabled: !!user,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['my-communities', user?.id] });
  };

  return {
    myCommunities,
    isLoading,
    error,
    refetch,
  };
}
