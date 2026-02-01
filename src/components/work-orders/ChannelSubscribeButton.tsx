import { Button } from '@/components/ui/button';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

interface ChannelSubscribeButtonProps {
  gameTitle: GameTitle;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
  className?: string;
}

const gameLabels: Record<GameTitle, string> = {
  ATS: 'Trucking',
  Farming_Sim: 'Farming',
  Construction_Sim: 'Construction',
  Mechanic_Sim: 'Mechanic',
};

export function ChannelSubscribeButton({
  gameTitle,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className,
}: ChannelSubscribeButtonProps) {
  const { user } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, isSubscribing, isUnsubscribing } = useChannelSubscriptions();
  
  const subscribed = isSubscribed(gameTitle);
  const isLoading = isSubscribing || isUnsubscribing;

  const handleClick = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to subscribe to channels.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (subscribed) {
        await unsubscribe(gameTitle);
        toast({
          title: 'Unsubscribed',
          description: `You've unsubscribed from ${gameLabels[gameTitle]} channel.`,
        });
      } else {
        await subscribe(gameTitle);
        toast({
          title: 'Subscribed!',
          description: `You'll now see ${gameLabels[gameTitle]} work orders in your feed.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update subscription. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={subscribed ? 'default' : variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        subscribed && 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="h-4 w-4 fill-current" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {showLabel && size !== 'icon' && (
        <span className="ml-1.5">{subscribed ? 'Subscribed' : 'Subscribe'}</span>
      )}
    </Button>
  );
}
