import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GameTitle } from '@/types/tenant';

export interface SimDeepDiveResource {
  key: string;
  title: string;
  description: string;
  href: string;
  accentColor: string;
  iconKey: string;
  ctaLabel?: string;
}

export interface SimCategory {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  icon_key: string;
  accent_color: string;
  display_order: number;
  default_game_titles: GameTitle[];
  deep_dive_resources: SimDeepDiveResource[];
  is_active: boolean;
}

export function useSimCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['sim-categories', includeInactive],
    queryFn: async (): Promise<SimCategory[]> => {
      let q = supabase.from('sim_categories' as never).select('*').order('display_order', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        key: r.key as string,
        title: r.title as string,
        subtitle: (r.subtitle as string | null) ?? null,
        icon_key: (r.icon_key as string) || 'target',
        accent_color: (r.accent_color as string) || '#F59E0B',
        display_order: (r.display_order as number) ?? 0,
        default_game_titles: (r.default_game_titles as GameTitle[]) || [],
        deep_dive_resources: Array.isArray(r.deep_dive_resources) ? (r.deep_dive_resources as SimDeepDiveResource[]) : [],
        is_active: (r.is_active as boolean) ?? true,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function resolveCategoryKey(
  wo: { game_title: GameTitle; category_key?: string | null },
  categories: SimCategory[]
): string | null {
  if (wo.category_key) return wo.category_key;
  return categories.find((c) => c.default_game_titles.includes(wo.game_title))?.key ?? null;
}
