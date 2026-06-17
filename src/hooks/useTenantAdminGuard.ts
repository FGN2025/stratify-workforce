import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useUserRole } from './useUserRole';

/**
 * Returns whether the current user is an admin of the active tenant
 * (or any ancestor tenant), OR a platform-level admin/super_admin.
 *
 * Used to gate tenant-scoped admin UIs like Curation.
 */
export function useTenantAdminGuard() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const tenantId = tenant?.id ?? null;

  const query = useQuery({
    queryKey: ['is-tenant-admin', user?.id, tenantId],
    enabled: !!user?.id && !!tenantId,
    queryFn: async () => {
      if (!user?.id || !tenantId) return false;
      const { data, error } = await supabase.rpc('is_tenant_admin', {
        p_user_id: user.id,
        p_tenant_id: tenantId,
      });
      if (error) {
        console.error('is_tenant_admin check failed', error);
        return false;
      }
      return !!data;
    },
  });

  const isTenantAdmin = !!query.data;
  const canManageTenant = isSuperAdmin || isAdmin || isTenantAdmin;

  return {
    canManageTenant,
    isTenantAdmin,
    isPlatformAdmin: isAdmin || isSuperAdmin,
    isLoading: roleLoading || query.isLoading,
  };
}
