import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  hours: number;
  xp: number;
  change: number; // stub — no historical data yet
}

export function useLeaderboard(gameFilter: string = 'all') {
  const { user, session } = useAuth();

  const query = useQuery({
    queryKey: ['leaderboard', gameFilter, session?.access_token],
    queryFn: async () => {
      const filterValue = gameFilter === 'all' ? null : gameFilter;
      const { data, error } = await supabase.rpc('get_leaderboard_data', {
        _game_title: filterValue,
      } as any);
      if (error) throw error;

      const entries: LeaderboardEntry[] = (data || []).map((row: any, index: number) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username || 'Unknown',
        avatarUrl: row.avatar_url,
        score: Number(row.employability_score) || 0,
        hours: Number(row.total_play_time_hours) || 0,
        xp: row.total_xp || 0,
        change: 0,
      }));

      return entries;
    },
    enabled: !!session?.access_token,
  });

  const currentUserEntry = query.data?.find(e => e.userId === user?.id) || null;

  return {
    entries: query.data || [],
    currentUserEntry,
    isLoading: query.isLoading,
    error: query.error,
  };
}
