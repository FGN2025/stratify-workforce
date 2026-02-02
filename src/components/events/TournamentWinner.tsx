import { useEffect, useRef } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/hooks/useConfetti';

interface TournamentWinnerProps {
  winner: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  eventTitle: string;
  className?: string;
}

export function TournamentWinner({ winner, eventTitle, className }: TournamentWinnerProps) {
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    // Fire confetti only once when component mounts
    if (!hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      // Small delay for visual impact
      const timer = setTimeout(() => {
        fireConfetti();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Card className={cn('overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10', className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Crown icon */}
          <div className="relative">
            <div className="absolute -inset-3 bg-primary/20 rounded-full blur-lg" />
            <div className="relative bg-primary/20 p-3 rounded-full">
              <Crown className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 mb-2">
              <Trophy className="h-3 w-3 mr-1" />
              Tournament Champion
            </Badge>
            <p className="text-xs text-muted-foreground">{eventTitle}</p>
          </div>

          {/* Winner info */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-primary/50 shadow-lg shadow-primary/20">
                <AvatarImage src={winner.avatar_url || undefined} />
                <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                  {winner.username?.[0]?.toUpperCase() || 'W'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5">
                <Trophy className="h-4 w-4" />
              </div>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {winner.username || 'Champion'}
            </p>
          </div>

          {/* Decorative elements */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-medium">Congratulations!</span>
            <span className="text-lg">🎉</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
