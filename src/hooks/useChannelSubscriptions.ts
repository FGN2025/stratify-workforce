import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

interface ChannelSubscription {
  id: string;
  game_title: GameTitle;
  created_at: string;
}

export function useChannelSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading, error } = useQuery({
    queryKey: ['channel-subscriptions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('channel_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as ChannelSubscription[];
    },
  });

  const subscribedGames = subscriptions.map(s => s.game_title);

  const isSubscribed = (gameTitle: GameTitle): boolean => {
    return subscribedGames.includes(gameTitle);
  };

  const subscribeMutation = useMutation({
    mutationFn: async (gameTitle: GameTitle) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('channel_subscriptions')
        .insert({
          user_id: user.id,
          game_title: gameTitle,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-subscriptions', user?.id] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (gameTitle: GameTitle) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('channel_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('game_title', gameTitle);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-subscriptions', user?.id] });
    },
  });

  return {
    subscriptions,
    subscribedGames,
    isLoading,
    error,
    isSubscribed,
    subscribe: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
  };
}
