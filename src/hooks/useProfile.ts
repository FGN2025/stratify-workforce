import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SkillSet } from '@/types/tenant';

export interface ProfileData {
  id: string;
  username: string | null;
  avatar_url: string | null;
  employability_score: number | null;
  skills: SkillSet | null;
  created_at: string;
  tenant_id: string | null;
}

export interface SkillCredential {
  id: string;
  title: string;
  credential_type: string;
  issued_at: string;
  expires_at: string | null;
  score: number | null;
  issuer: string | null;
  skills_verified: string[] | null;
}

export interface UserAchievement {
  id: string;
  earned_at: string;
  achievement: {
    id: string;
    name: string;
    description: string | null;
    icon_name: string;
    rarity: string;
    category: string;
    xp_reward: number;
  };
}

export function useProfile(userId?: string) {
  const { user, session } = useAuth();
  const targetUserId = userId || user?.id;

  const profileQuery = useQuery({
    queryKey: ['profile', targetUserId, session?.access_token],
    queryFn: async () => {
      if (!targetUserId) return null;

      // For viewing other users, use the public profile function
      if (userId && userId !== user?.id) {
        const { data, error } = await supabase
          .rpc('get_public_profile_data', { profile_ids: [targetUserId] });
        
        if (error) throw error;
        if (!data || data.length === 0) return null;

        // Get additional profile data that might be public
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('employability_score, skills, created_at, tenant_id')
          .eq('id', targetUserId)
          .single();

        return {
          id: data[0].id,
          username: data[0].username,
          avatar_url: data[0].avatar_url,
          employability_score: fullProfile?.employability_score ?? null,
          skills: fullProfile?.skills as unknown as SkillSet | null,
          created_at: fullProfile?.created_at ?? new Date().toISOString(),
          tenant_id: fullProfile?.tenant_id ?? null,
        } as ProfileData;
      }

      // For own profile, fetch directly
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      return {
        ...data,
        skills: data.skills as unknown as SkillSet | null,
      } as ProfileData;
    },
    // Wait for both userId and session to be available
    enabled: !!targetUserId && !!session?.access_token,
  });

  const credentialsQuery = useQuery({
    queryKey: ['skill-credentials', targetUserId, session?.access_token],
    queryFn: async () => {
      if (!targetUserId) return [];

      // First get the passport
      const { data: passport, error: passportError } = await supabase
        .from('skill_passport')
        .select('id, is_public')
        .eq('user_id', targetUserId)
        .single();

      if (passportError || !passport) return [];

      // Check if we can view this passport
      const isOwnProfile = targetUserId === user?.id;
      if (!isOwnProfile && !passport.is_public) return [];

      const { data, error } = await supabase
        .from('skill_credentials')
        .select('*')
        .eq('passport_id', passport.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      return data as SkillCredential[];
    },
    enabled: !!targetUserId && !!session?.access_token,
  });

  const achievementsQuery = useQuery({
    queryKey: ['user-achievements', targetUserId, session?.access_token],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          earned_at,
          achievement:achievements (
            id,
            name,
            description,
            icon_name,
            rarity,
            category,
            xp_reward
          )
        `)
        .eq('user_id', targetUserId)
        .order('earned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as unknown as UserAchievement[];
    },
    enabled: !!targetUserId && !!session?.access_token,
  });

  const statsQuery = useQuery({
    queryKey: ['user-stats', targetUserId, session?.access_token],
    queryFn: async () => {
      if (!targetUserId) return { totalHours: 0, totalXp: 0 };

      // Get total XP
      const { data: xpData } = await supabase
        .rpc('get_user_total_xp', { p_user_id: targetUserId });

      // Get total play time from game stats
      const { data: gameStats } = await supabase
        .from('user_game_stats')
        .select('total_play_time_minutes')
        .eq('user_id', targetUserId);

      const totalMinutes = gameStats?.reduce((sum, stat) => sum + stat.total_play_time_minutes, 0) || 0;

      return {
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        totalXp: xpData || 0,
      };
    },
    enabled: !!targetUserId && !!session?.access_token,
  });

  const isOwnProfile = !userId || userId === user?.id;

  return {
    profile: profileQuery.data,
    credentials: credentialsQuery.data || [],
    achievements: achievementsQuery.data || [],
    stats: statsQuery.data || { totalHours: 0, totalXp: 0 },
    isLoading: profileQuery.isLoading || credentialsQuery.isLoading || achievementsQuery.isLoading,
    isOwnProfile,
    error: profileQuery.error || credentialsQuery.error || achievementsQuery.error,
  };
}
