import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

export interface Student {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  employability_score: number;
  total_hours: number;
  last_active: string | null;
  status: 'active' | 'idle' | 'offline';
  current_game: GameTitle | null;
  trend: number;
}

interface ProfileWithStats {
  id: string;
  username: string | null;
  avatar_url: string | null;
  employability_score: number | null;
  updated_at: string;
}

interface GameStats {
  user_id: string;
  total_play_time_minutes: number;
  last_played_at: string | null;
  game_title: GameTitle;
}

interface ActiveSession {
  user_id: string;
  work_order: {
    game_title: GameTitle;
  } | null;
}

export function useStudents() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['students', tenant?.id],
    queryFn: async (): Promise<Student[]> => {
      if (!tenant?.id) return [];

      // Fetch profiles for the current tenant
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, employability_score, updated_at')
        .eq('tenant_id', tenant.id);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map(p => p.id);

      // Fetch game stats for all users in parallel
      const { data: gameStats, error: statsError } = await supabase
        .from('user_game_stats')
        .select('user_id, total_play_time_minutes, last_played_at, game_title')
        .in('user_id', userIds);

      if (statsError) throw statsError;

      // Fetch active sessions (sessions without completed_at in last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('telemetry_sessions')
        .select(`
          user_id,
          work_order:work_orders(game_title)
        `)
        .in('user_id', userIds)
        .is('completed_at', null)
        .gte('started_at', thirtyMinutesAgo);

      if (sessionsError) throw sessionsError;

      // Build a map of user stats
      const statsMap = new Map<string, { totalMinutes: number; lastPlayed: string | null }>();
      (gameStats || []).forEach((stat: GameStats) => {
        const existing = statsMap.get(stat.user_id);
        const lastPlayed = stat.last_played_at;
        
        if (existing) {
          existing.totalMinutes += stat.total_play_time_minutes;
          if (lastPlayed && (!existing.lastPlayed || lastPlayed > existing.lastPlayed)) {
            existing.lastPlayed = lastPlayed;
          }
        } else {
          statsMap.set(stat.user_id, {
            totalMinutes: stat.total_play_time_minutes,
            lastPlayed: lastPlayed,
          });
        }
      });

      // Build active sessions map
      const activeSessionsMap = new Map<string, GameTitle | null>();
      (activeSessions || []).forEach((session: ActiveSession) => {
        const gameTitle = session.work_order?.game_title || null;
        activeSessionsMap.set(session.user_id, gameTitle);
      });

      // Transform profiles into Student objects
      const students: Student[] = profiles.map((profile: ProfileWithStats) => {
        const stats = statsMap.get(profile.id);
        const isActive = activeSessionsMap.has(profile.id);
        const currentGame = activeSessionsMap.get(profile.id) || null;
        
        // Determine status based on last activity
        let status: 'active' | 'idle' | 'offline' = 'offline';
        if (isActive) {
          status = 'active';
        } else if (stats?.lastPlayed) {
          const lastPlayedTime = new Date(stats.lastPlayed).getTime();
          const hourAgo = Date.now() - 60 * 60 * 1000;
          if (lastPlayedTime > hourAgo) {
            status = 'idle';
          }
        }

        // Format last active time
        let lastActiveFormatted: string | null = null;
        if (stats?.lastPlayed) {
          const lastPlayedDate = new Date(stats.lastPlayed);
          const now = new Date();
          const diffMs = now.getTime() - lastPlayedDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) {
            lastActiveFormatted = 'Just now';
          } else if (diffMins < 60) {
            lastActiveFormatted = `${diffMins} min ago`;
          } else if (diffHours < 24) {
            lastActiveFormatted = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          } else {
            lastActiveFormatted = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          }
        }

        return {
          id: profile.id,
          username: profile.username || 'Unknown User',
          email: null, // Email not available from profiles table
          avatar_url: profile.avatar_url,
          employability_score: profile.employability_score || 0,
          total_hours: Math.round((stats?.totalMinutes || 0) / 60),
          last_active: lastActiveFormatted,
          status,
          current_game: currentGame,
          trend: 0, // Would need historical data to calculate
        };
      });

      // Sort by employability score descending
      return students.sort((a, b) => b.employability_score - a.employability_score);
    },
    enabled: !!tenant?.id,
  });
}
