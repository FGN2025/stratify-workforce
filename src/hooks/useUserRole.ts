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
  const [role, setRole] = useState<AppRole | null>(null);
  // Start in loading state so route guards don't read a stale `isAdmin=false`
  // for one render between auth resolving and the role fetch starting.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    // Set loading synchronously on user change so guards wait for fetch.
    setIsLoading(true);

    const fetchRole = async () => {
      console.log('[useUserRole] Fetching role for user:', user.id, user.email);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

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
  }, [user]);

  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin' || role === 'super_admin',
    isModerator: role === 'moderator' || role === 'super_admin',
    isDeveloper: role === 'developer' || role === 'super_admin',
    isLoading,
  };
}
