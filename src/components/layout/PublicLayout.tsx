import { NavLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex min-w-0 items-center gap-3" aria-label="FGN Academy home">
            <img src="/fgn-logo.png" alt="FGN Academy" className="h-10 w-auto object-contain" />
            <span className="hidden font-display text-lg font-semibold sm:block">FGN Academy</span>
          </NavLink>

          <nav className="flex items-center gap-2" aria-label="Public navigation">
            <Button variant="ghost" asChild>
              <NavLink to="/learn">Courses</NavLink>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <NavLink to="/auth">Sign in</NavLink>
            </Button>
            <Button asChild>
              <NavLink to="/auth" className="gap-2">
                Join
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </Button>
          </nav>
        </div>
      </header>

      <main>{children}</main>
      <Footer />
    </div>
  );
}