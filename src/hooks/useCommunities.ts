import { TENANT_COLUMNS } from '@/lib/tenantColumns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types/tenant';

export type CommunityScope = 'all' | 'managed' | 'directory';

const MANAGER_ROLES = ['owner', 'admin', 'moderator'] as const;

/**
 * scope:
 *  - all: platform admins, every approved community
 *  - managed: community admins, only communities they manage + their children
 *  - directory: learners / signed-out visitors, approved public directory
 * Display scoping only — database rules still enforce access.
 */
export function useCommunities(scope: CommunityScope = 'directory', enabled = true) {
  const queryClient = useQueryClient();
  const { user, session, loading } = useAuth() as ReturnType<typeof useAuth> & { loading?: boolean };
  const token = session?.access_token ?? null;

  const { data: communities = [], isLoading, error } = useQuery({
    queryKey: ['communities', scope, user?.id ?? 'anon', !!token],
    enabled: enabled && !loading && (!user || !!token),
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) {
        const { data, error } = await supabase.from('public_communities').select('*').order('name');
        if (error) throw error;
        return data as unknown as Tenant[];
      }

      if (scope === 'managed') {
        const { data: memberships, error: mErr } = await supabase
          .from('community_memberships')
          .select('tenant_id, role')
          .eq('user_id', user.id)
          .in('role', MANAGER_ROLES as unknown as string[]);
        if (mErr) throw mErr;
        const roots = [...new Set((memberships ?? []).map((m: any) => m.tenant_id as string))];
        if (roots.length === 0) return [] as Tenant[];
        const children = await Promise.all(
          roots.map((id) => supabase.rpc('get_child_tenants', { p_tenant_id: id })),
        );
        const ids = [...new Set([...roots, ...children.flatMap((r) => (r.data as string[] | null) ?? [])])];
        const { data, error } = await supabase
          .from('tenants')
          .select(TENANT_COLUMNS)
          .in('id', ids)
          .order('name');
        if (error) throw error;
        return data as unknown as Tenant[];
      }

      const { data, error } = await supabase
        .from('tenants')
        .select(TENANT_COLUMNS)
        .eq('approval_status', 'approved')
        .order('name');
      if (error) throw error;
      return data as unknown as Tenant[];
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['communities'] });

  return { communities, isLoading, error, refetch };
}

/** True when the user owns/administers/moderates at least one community. */
export function useIsCommunityManager() {
  const { user, session } = useAuth();
  const { data = false, isLoading } = useQuery({
    queryKey: ['is-community-manager', user?.id],
    enabled: !!user && !!session?.access_token,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('community_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('role', MANAGER_ROLES as unknown as string[]);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
  return { isManager: data, isLoading: !!user && isLoading };
}
