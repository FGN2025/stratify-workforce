import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeepDiveResource {
  id: string;
  key: string;
  title: string;
  description: string | null;
  href: string;
  cta_label: string | null;
  icon_key: string;
  accent_color: string;
  display_order: number;
  is_active: boolean;
}

export function useDeepDiveResources(includeInactive = false) {
  return useQuery({
    queryKey: ['deep-dive-resources', includeInactive],
    queryFn: async (): Promise<DeepDiveResource[]> => {
      let q = supabase
        .from('sim_deep_dive_resources')
        .select('*')
        .order('display_order', { ascending: true })
        .order('title', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DeepDiveResource[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface CategoryResourceLink {
  category_id: string;
  resource_id: string;
  display_order: number;
}

export function useCategoryResourceLinks() {
  return useQuery({
    queryKey: ['sim-category-deep-dive'],
    queryFn: async (): Promise<CategoryResourceLink[]> => {
      const { data, error } = await supabase
        .from('sim_category_deep_dive')
        .select('category_id, resource_id, display_order');
      if (error) throw error;
      return (data || []) as CategoryResourceLink[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
