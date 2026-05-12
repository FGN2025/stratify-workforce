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
  /** Resource IDs from sim_deep_dive_resources currently linked (for edit picker) */
  resource_ids: string[];
  is_active: boolean;
}

export function useSimCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['sim-categories', includeInactive],
    queryFn: async (): Promise<SimCategory[]> => {
      let q = supabase
        .from('sim_categories')
        .select('*, sim_category_deep_dive(resource_id, display_order, sim_deep_dive_resources(*))')
        .order('display_order', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true) as typeof q;
      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((r: Record<string, unknown>) => {
        const links = Array.isArray(r.sim_category_deep_dive)
          ? (r.sim_category_deep_dive as Array<{
              resource_id: string;
              display_order: number;
              sim_deep_dive_resources: {
                id: string;
                key: string;
                title: string;
                description: string | null;
                href: string;
                cta_label: string | null;
                icon_key: string;
                accent_color: string;
                is_active: boolean;
              } | null;
            }>)
          : [];
        const sortedLinks = [...links]
          .filter((l) => l.sim_deep_dive_resources && l.sim_deep_dive_resources.is_active)
          .sort((a, b) => a.display_order - b.display_order);

        const fromLibrary: SimDeepDiveResource[] = sortedLinks.map((l) => ({
          key: l.sim_deep_dive_resources!.key,
          title: l.sim_deep_dive_resources!.title,
          description: l.sim_deep_dive_resources!.description ?? '',
          href: l.sim_deep_dive_resources!.href,
          accentColor: l.sim_deep_dive_resources!.accent_color,
          iconKey: l.sim_deep_dive_resources!.icon_key,
          ctaLabel: l.sim_deep_dive_resources!.cta_label ?? undefined,
        }));

        // Fallback: if no library links, use legacy JSONB column
        const jsonbResources = Array.isArray(r.deep_dive_resources)
          ? (r.deep_dive_resources as SimDeepDiveResource[])
          : [];

        return {
          id: r.id as string,
          key: r.key as string,
          title: r.title as string,
          subtitle: (r.subtitle as string | null) ?? null,
          icon_key: (r.icon_key as string) || 'target',
          accent_color: (r.accent_color as string) || '#F59E0B',
          display_order: (r.display_order as number) ?? 0,
          default_game_titles: (r.default_game_titles as GameTitle[]) || [],
          deep_dive_resources: fromLibrary.length > 0 ? fromLibrary : jsonbResources,
          resource_ids: sortedLinks.map((l) => l.resource_id),
          is_active: (r.is_active as boolean) ?? true,
        };
      });
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
