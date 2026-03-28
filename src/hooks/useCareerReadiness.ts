import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CareerReadiness {
  careerPathId: string;
  matchedCount: number;
  totalCount: number;
  readinessPct: number;
  matchedLabels: string[];
}

export type ReadinessMap = Record<string, CareerReadiness>;

export function useCareerReadiness(userId?: string) {
  const { user, session } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['career-readiness', targetUserId],
    queryFn: async (): Promise<ReadinessMap> => {
      if (!targetUserId) return {};

      const { data, error } = await supabase.rpc('calculate_readiness', {
        p_user_id: targetUserId,
      });

      if (error) throw error;

      const map: ReadinessMap = {};
      for (const row of data || []) {
        map[row.career_path_id] = {
          careerPathId: row.career_path_id,
          matchedCount: Number(row.matched_count),
          totalCount: Number(row.total_count),
          readinessPct: Number(row.readiness_pct),
          matchedLabels: row.matched_labels || [],
        };
      }
      return map;
    },
    enabled: !!targetUserId && !!session?.access_token,
  });
}
