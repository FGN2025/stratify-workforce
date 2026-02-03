import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface DeveloperRouteProps {
  children: React.ReactNode;
}

export function DeveloperRoute({ children }: DeveloperRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isDeveloper, isLoading: roleLoading } = useUserRole();
  const location = useLocation();
  const hasShownToast = useRef(false);

  const isLoading = authLoading || roleLoading;

  useEffect(() => {
    // Reset toast flag when user changes
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

  if (!isDeveloper) {
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Access Denied",
        description: "You need developer access to manage API credentials. Contact an administrator.",
        variant: "destructive",
      });
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
