import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserPoints, SourceType, PointsType } from '@/types/lms';
import { getLevelFromXP } from '@/types/lms';

// Fetch total XP for current user
export function useUserXP() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-xp', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { total: 0, level: 1, name: 'Novice', progress: 0, nextLevelXP: 200 };

      const { data, error } = await supabase
        .from('user_points')
        .select('amount')
        .eq('user_id', user.id)
        .eq('points_type', 'xp');

      if (error) throw error;

      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const levelInfo = getLevelFromXP(total);

      return {
        total,
        ...levelInfo,
      };
    },
  });
}

// Fetch point history for current user
export function usePointsHistory(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-points', user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        points_type: p.points_type as PointsType,
        amount: p.amount,
        source_type: p.source_type as SourceType,
        source_id: p.source_id,
        description: p.description,
        created_at: p.created_at,
      })) as UserPoints[];
    },
  });
}

// Award points to current user
export function useAwardPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      sourceType,
      sourceId,
      description,
      pointsType = 'xp',
    }: {
      amount: number;
      sourceType: SourceType;
      sourceId?: string;
      description?: string;
      pointsType?: PointsType;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('user_points')
        .insert({
          user_id: user.id,
          points_type: pointsType,
          amount,
          source_type: sourceType,
          source_id: sourceId || null,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-xp', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-points', user?.id] });
    },
  });
}

// Calculate XP with multipliers
export function calculateXP({
  baseXP,
  score,
  streakDays = 0,
}: {
  baseXP: number;
  score?: number;
  streakDays?: number;
}): number {
  // Score multiplier
  let scoreMultiplier = 1.0;
  if (score !== undefined) {
    if (score >= 90) {
      scoreMultiplier = 1.5;
    } else if (score >= 80) {
      scoreMultiplier = 1.2;
    }
  }

  // Streak bonus
  let streakMultiplier = 1.0;
  if (streakDays >= 7) {
    streakMultiplier = 1.1;
  }

  return Math.round(baseXP * scoreMultiplier * streakMultiplier);
}

// Get leaderboard
export function useXPLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['xp-leaderboard', limit],
    queryFn: async () => {
      // Aggregate XP per user
      const { data: points, error } = await supabase
        .from('user_points')
        .select('user_id, amount')
        .eq('points_type', 'xp');

      if (error) throw error;

      // Sum by user
      const userTotals = new Map<string, number>();
      points?.forEach((p) => {
        userTotals.set(p.user_id, (userTotals.get(p.user_id) || 0) + p.amount);
      });

      // Get user IDs sorted by XP
      const sortedUsers = Array.from(userTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      if (sortedUsers.length === 0) return [];

      // Fetch profiles
      const userIds = sortedUsers.map((u) => u[0]);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      return sortedUsers.map(([userId, xp], index) => {
        const profile = profileMap.get(userId);
        const levelInfo = getLevelFromXP(xp);
        return {
          rank: index + 1,
          userId,
          username: profile?.username || 'Anonymous',
          avatar_url: profile?.avatar_url,
          xp,
          level: levelInfo.level,
          levelName: levelInfo.name,
        };
      });
    },
  });
}
