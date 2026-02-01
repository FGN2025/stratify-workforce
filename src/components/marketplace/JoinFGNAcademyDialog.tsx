import { useState, useEffect } from 'react';
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
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { AcademyOnboardingDialog } from '@/components/onboarding/AcademyOnboardingDialog';
import { GameIcon, getGameLabel } from '@/components/dashboard/GameIcon';
import { Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { GameTitle } from '@/types/tenant';

interface JoinFGNAcademyDialogProps {
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

export function JoinFGNAcademyDialog({ open, onOpenChange }: JoinFGNAcademyDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, isSubscribing, isUnsubscribing } = useChannelSubscriptions();
  const { hasCompletedOnboarding, isLoading: isLoadingOnboarding } = useOnboardingStatus();
  const [processingGame, setProcessingGame] = useState<GameTitle | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSimSelection, setShowSimSelection] = useState(false);

  // When dialog opens, determine which view to show
  useEffect(() => {
    if (open && user && !isLoadingOnboarding) {
      if (hasCompletedOnboarding) {
        setShowSimSelection(true);
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
        setShowSimSelection(false);
      }
    }
  }, [open, user, hasCompletedOnboarding, isLoadingOnboarding]);

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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowSimSelection(true);
  };

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      setShowOnboarding(false);
      setShowSimSelection(false);
    }
    onOpenChange(newOpen);
  };

  // If not logged in, show sign-in prompt
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Join FGN Academy</DialogTitle>
            <DialogDescription>
              Sign in to join FGN Academy and access simulation training.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Create an account or sign in to get started.
            </p>
            <Button onClick={() => { onOpenChange(false); navigate('/auth'); }}>
              Sign In / Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show loading state while checking onboarding status
  if (isLoadingOnboarding) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show onboarding dialog if user hasn't completed it
  if (showOnboarding) {
    return (
      <AcademyOnboardingDialog
        open={open}
        onOpenChange={handleDialogClose}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Show sim selection (default for users who have completed onboarding)
  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">FGN Academy Simulations</DialogTitle>
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
      </DialogContent>
    </Dialog>
  );
}
