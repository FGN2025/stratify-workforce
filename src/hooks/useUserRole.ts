import { useState, useEffect } from 'react';
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
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email;
  const [role, setRole] = useState<AppRole | null>(null);
  // Start in loading state so route guards don't read a stale `isAdmin=false`
  // for one render between auth resolving and the role fetch starting.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchRole = async () => {
      console.log('[useUserRole] Fetching role for user:', userId, userEmail);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[useUserRole] Error fetching user role:', error);
        setRole(null);
      } else {
        console.log('[useUserRole] Role result:', data);
        setRole(data?.role || null);
      }
      setIsLoading(false);
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
    // Depend on the primitive userId (stable across auth context re-renders)
    // rather than the user object, which can be a new reference each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin' || role === 'super_admin',
    isModerator: role === 'moderator' || role === 'super_admin',
    isDeveloper: role === 'developer' || role === 'super_admin',
    isLoading,
  };
}
