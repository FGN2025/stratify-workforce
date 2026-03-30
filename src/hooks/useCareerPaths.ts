import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CareerPath {
  id: string;
  min_readiness_pct: number;
  training_bridge_url: string | null;
  training_bridge_label: string | null;
}

export function useCareerPaths() {
  return useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('id, min_readiness_pct, training_bridge_url, training_bridge_label');
      if (error) throw error;
      const map: Record<string, CareerPath> = {};
      for (const row of data || []) {
        map[row.id] = row;
      }
      return map;
    },
  });
}
