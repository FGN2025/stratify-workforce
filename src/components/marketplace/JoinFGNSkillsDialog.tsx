import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { GameIcon, getGameLabel } from '@/components/dashboard/GameIcon';
import { Check, Loader2, Truck, Tractor, HardHat, Wrench } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { GameTitle } from '@/types/tenant';

interface JoinFGNSkillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_SIMS: { game: GameTitle; description: string; workOrderCount: number }[] = [
  {
    game: 'ATS',
    description: 'Master long-haul trucking across America with freight delivery challenges.',
    workOrderCount: 45,
  },
  {
    game: 'Farming_Sim',
    description: 'Develop precision agriculture skills with crop and livestock management.',
    workOrderCount: 38,
  },
  {
    game: 'Construction_Sim',
    description: 'Operate heavy equipment and complete excavation and building projects.',
    workOrderCount: 32,
  },
  {
    game: 'Mechanic_Sim',
    description: 'Diagnose and repair vehicles with hands-on mechanical challenges.',
    workOrderCount: 28,
  },
];

export function JoinFGNSkillsDialog({ open, onOpenChange }: JoinFGNSkillsDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, isSubscribing, isUnsubscribing } = useChannelSubscriptions();
  const [processingGame, setProcessingGame] = useState<GameTitle | null>(null);

  const handleToggleSubscription = async (game: GameTitle) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to subscribe to simulation tracks.',
        variant: 'destructive',
      });
      onOpenChange(false);
      navigate('/auth');
      return;
    }

    setProcessingGame(game);
    try {
      if (isSubscribed(game)) {
        await unsubscribe(game);
        toast({
          title: 'Unsubscribed',
          description: `You've unsubscribed from ${getGameLabel(game)}.`,
        });
      } else {
        await subscribe(game);
        toast({
          title: 'Subscribed!',
          description: `Welcome to ${getGameLabel(game)}! View work orders to start training.`,
        });
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingGame(null);
    }
  };

  const handleViewWorkOrders = (game: GameTitle) => {
    onOpenChange(false);
    navigate(`/work-orders?filter=${game}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Join FGN Skills</DialogTitle>
          <DialogDescription>
            Subscribe to simulation tracks to access work orders, skill challenges, and training scenarios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {AVAILABLE_SIMS.map((sim) => {
            const subscribed = isSubscribed(sim.game);
            const isProcessing = processingGame === sim.game;

            return (
              <div
                key={sim.game}
                className={`p-4 rounded-lg border transition-all ${
                  subscribed 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border hover:border-primary/30 hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <GameIcon game={sim.game} size="lg" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {getGameLabel(sim.game)}
                      </h3>
                      {subscribed && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Subscribed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {sim.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sim.workOrderCount} work orders available
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={subscribed ? 'outline' : 'default'}
                      onClick={() => handleToggleSubscription(sim.game)}
                      disabled={isProcessing || isSubscribing || isUnsubscribing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : subscribed ? (
                        'Leave'
                      ) : (
                        'Join'
                      )}
                    </Button>
                    {subscribed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => handleViewWorkOrders(sim.game)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!user && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
              <Button variant="link" className="p-0 h-auto" onClick={() => { onOpenChange(false); navigate('/auth'); }}>
                Sign in
              </Button>
              {' '}to subscribe and track your progress.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
