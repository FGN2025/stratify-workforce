import { useQuery } from '@tanstack/react-query';
import type { RegistryProgram } from '@/hooks/usePrograms';

export type ListingStatus = 'live' | 'preview' | 'coming_soon';

export interface Discipline {
  key: string;
  name: string;
  tagline: string | null;
  description: string | null;
  accent_color: string | null;
  status: ListingStatus;
  featured: boolean;
  sort_order: number;
}

export interface MarketplaceApp {
  key: string;
  name: string;
  short_name: string | null;
  tagline: string | null;
  description: string | null;
  launch_type: 'subdomain' | 'external' | 'in_academy';
  launch_url: string | null;
  in_academy_path: string | null;
  legacy_urls: string[];
  status: ListingStatus;
  access_terms: 'open' | 'sign_in' | 'organization_invite';
  shared_services: Record<string, string>;
  accent_color: string | null;
  hero_image_url: string | null;
  featured: boolean;
  program_key: string | null;
  games: string[];
  /** Discipline keys, primary first. */
  disciplines: string[];
}

export interface MarketplaceRegistry {
  programs: RegistryProgram[];
  disciplines: Discipline[];
  applications: MarketplaceApp[];
  /** Competition sources (FGN.GG). Listed alongside apps, never a discipline or program. */
  competitionSources: RegistryProgram[];
}

const FEED = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/program-registry`;

export const STATUS_LABEL: Record<ListingStatus, string> = { live: 'Live', preview: 'Preview', coming_soon: 'Coming soon' };
export const ACCESS_LABEL: Record<MarketplaceApp['access_terms'], string> = {
  open: 'Open to everyone',
  sign_in: 'Free with an FGN Academy account',
  organization_invite: 'By organization invitation',
};
export const LAUNCH_LABEL: Record<MarketplaceApp['launch_type'], string> = {
  subdomain: 'FGN Academy app',
  external: 'Partner site',
  in_academy: 'Inside FGN Academy',
};

/** Public marketplace registry. Browsing a discipline or app never changes organization or access. */
export function useMarketplace() {
  return useQuery({
    queryKey: ['marketplace-registry'],
    queryFn: async (): Promise<MarketplaceRegistry> => {
      const res = await fetch(FEED, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      if (!res.ok) throw new Error('Marketplace unavailable');
      const body = await res.json();
      const programs: RegistryProgram[] = body.programs ?? [];
      return {
        programs,
        disciplines: body.disciplines ?? [],
        applications: body.applications ?? [],
        competitionSources: programs.filter((p) => p.kind === 'competition_source'),
      };
    },
    staleTime: 60_000,
  });
}

/** Where the Launch button goes. */
export function launchTarget(app: MarketplaceApp): { href: string; external: boolean } {
  if (app.launch_type !== 'in_academy' && app.launch_url) return { href: app.launch_url, external: true };
  return { href: app.in_academy_path || '/learn', external: false };
}
