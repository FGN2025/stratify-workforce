import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantAdminGuard } from '@/hooks/useTenantAdminGuard';
import { toast } from '@/hooks/use-toast';

interface CommunityAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Allows access if the viewer is a platform admin (admin / super_admin) OR
 * a community owner/admin of the active tenant.
 *
 * Platform-only sub-sections must still self-guard inside the rendered page.
 */
export function CommunityAdminRoute({ children }: CommunityAdminRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { isTenantAdmin, isLoading: tenantLoading } = useTenantAdminGuard();
  const location = useLocation();
  const hasShownToast = useRef(false);

  const isLoading = authLoading || roleLoading || tenantLoading;

  useEffect(() => {
    hasShownToast.current = false;
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin && !isTenantAdmin) {
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access community administration.",
        variant: 'destructive',
      });
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
