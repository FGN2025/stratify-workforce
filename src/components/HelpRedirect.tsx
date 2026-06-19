import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

export function HelpRedirect() {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) return null;

  return <Navigate to={isAdmin ? '/help/admin' : '/help/student'} replace />;
}
