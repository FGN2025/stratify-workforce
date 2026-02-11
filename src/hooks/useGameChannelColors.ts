import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GameTitle } from '@/types/tenant';

const DEFAULT_COLORS: Record<GameTitle, string> = {
  ATS: '#8B5CF6',
  Farming_Sim: '#22C55E',
  Construction_Sim: '#F59E0B',
  Mechanic_Sim: '#EF4444',
  Fiber_Tech: '#3B82F6',
};

export function useGameChannelColors() {
  const { data: colorMap = DEFAULT_COLORS } = useQuery({
    queryKey: ['game-channel-colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_channels')
        .select('game_title, accent_color');

      if (error || !data) return DEFAULT_COLORS;

      const map = { ...DEFAULT_COLORS };
      for (const row of data) {
        if (row.game_title in map) {
          map[row.game_title as GameTitle] = row.accent_color;
        }
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return colorMap;
}

export { DEFAULT_COLORS as GAME_DEFAULT_COLORS };
