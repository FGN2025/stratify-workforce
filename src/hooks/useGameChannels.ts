import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GameTitle } from '@/types/tenant';

export interface GameChannel {
  game_title: GameTitle;
  name: string;
  accent_color: string | null;
  description: string | null;
}

/**
 * All known game channels. Source of truth for which sims exist on the platform.
 * fetch-challenges upserts a row whenever a new play.fgn.gg game appears, so new
 * games become filterable / sidebar-visible without code changes.
 */
export function useGameChannels() {
  return useQuery({
    queryKey: ['game-channels-all'],
    queryFn: async (): Promise<GameChannel[]> => {
      const { data, error } = await supabase
        .from('game_channels')
        .select('game_title, name, accent_color, description')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as GameChannel[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
