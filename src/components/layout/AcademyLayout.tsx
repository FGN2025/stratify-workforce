import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from './AppLayout';
import { PublicLayout } from './PublicLayout';

interface AcademyLayoutProps {
  children: React.ReactNode;
}

export function AcademyLayout({ children }: AcademyLayoutProps) {
  const { user } = useAuth();
  return user ? <AppLayout>{children}</AppLayout> : <PublicLayout>{children}</PublicLayout>;
}