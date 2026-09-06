import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface JoinCtaBannerProps {
  message?: string;
}

/**
 * Conversion banner shown to signed-out visitors on public marketing pages.
 * Routes to /auth and preserves the current path for post-login return.
 */
export function JoinCtaBanner({
  message = 'Join free to track XP, earn credentials, and start training.',
}: JoinCtaBannerProps) {
  const location = useLocation();

  return (
    <div className="glass-card border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center sm:text-left">{message}</p>
      </div>
      <Button asChild className="gap-2 shrink-0">
        <Link to="/auth" state={{ from: location.pathname }}>
          Join free
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
