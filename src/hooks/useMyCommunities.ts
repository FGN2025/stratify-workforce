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

      // Fetch owned communities
      const { data: owned, error: ownedErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .order('submitted_at', { ascending: false });

      if (ownedErr) throw ownedErr;

      // Fetch communities where user is an approved member
      const { data: memberships, error: memberErr } = await supabase
        .from('community_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('request_status', 'approved');

      if (memberErr) throw memberErr;

      const ownedIds = new Set((owned || []).map(t => t.id));
      const memberTenantIds = (memberships || [])
        .map(m => m.tenant_id)
        .filter(id => !ownedIds.has(id));

      let memberTenants: Tenant[] = [];
      if (memberTenantIds.length > 0) {
        const { data: tenants, error: tenantErr } = await supabase
          .from('tenants')
          .select('*')
          .in('id', memberTenantIds)
          .order('name', { ascending: true });

        if (tenantErr) throw tenantErr;
        memberTenants = (tenants || []) as unknown as Tenant[];
      }

      const ownedTyped = (owned || []) as unknown as Tenant[];
      return [...ownedTyped, ...memberTenants];
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
