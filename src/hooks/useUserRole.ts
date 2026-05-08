import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UseUserRoleReturn {
  role: AppRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isDeveloper: boolean;
  isLoading: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user, session } = useAuth();
  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;

  const { data: role = null, isLoading } = useQuery({
    queryKey: ['user-role', userId, accessToken],
    queryFn: async (): Promise<AppRole | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[useUserRole] Error fetching user role:', error);
        return null;
      }

      return data?.role ?? null;
    },
    enabled: !!userId && !!accessToken,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin' || role === 'super_admin',
    isModerator: role === 'moderator' || role === 'super_admin',
    isDeveloper: role === 'developer' || role === 'super_admin',
    isLoading,
  };
}
