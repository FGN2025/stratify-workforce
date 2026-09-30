import { useQuery } from '@tanstack/react-query';

export interface RegistryProgram {
  key: string;
  name: string;
  short_name: string | null;
  kind: 'game' | 'trade' | 'industry' | 'vertical' | 'competition_source';
  canonical_url: string | null;
  legacy_urls: string[];
  tagline: string | null;
  logo_url: string | null;
  accent_color: string | null;
  availability: 'live' | 'preview' | 'coming_soon';
  capabilities: Record<string, string>;
  is_academy_program: boolean;
  games: string[];
  pathways: { course_id: string | null; work_order_id: string | null; label: string | null }[];
}

const FEED = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/program-registry`;

/** Public program registry. Program selection is browsing state only — never tenant context. */
export function usePrograms() {
  return useQuery({
    queryKey: ['program-registry'],
    queryFn: async (): Promise<RegistryProgram[]> => {
      const res = await fetch(FEED, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      if (!res.ok) throw new Error('Program list unavailable');
      const body = await res.json();
      return body.programs ?? [];
    },
    staleTime: 60_000,
  });
}
