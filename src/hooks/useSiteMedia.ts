import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteMedia {
  id: string;
  location_key: string;
  media_type: 'image' | 'video' | 'youtube' | 'audio';
  url: string;
  alt_text: string | null;
  title: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fallback images for when database is unavailable
const fallbackMedia: Record<string, string> = {
  home_hero_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=600&fit=crop',
  leaderboard_hero: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&h=400&fit=crop',
  profile_hero: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=400&fit=crop',
  students_hero: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=400&fit=crop',
  work_orders_hero: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1600&h=400&fit=crop',
  ats_cover: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=400&fit=crop',
  farming_sim_cover: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop',
  construction_sim_cover: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop',
  mechanic_sim_cover: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=400&fit=crop',
};

/**
 * Hook to fetch a single media item by its location key
 */
export function useSiteMedia(locationKey: string) {
  return useQuery({
    queryKey: ['site-media', locationKey],
    queryFn: async (): Promise<SiteMedia | null> => {
      const { data, error } = await supabase
        .from('site_media')
        .select('*')
        .eq('location_key', locationKey)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching site media:', error);
        return null;
      }

      return data as SiteMedia | null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

/**
 * Hook to get just the URL for a media location (with fallback)
 */
export function useSiteMediaUrl(locationKey: string): string {
  const { data } = useSiteMedia(locationKey);
  return data?.url || fallbackMedia[locationKey] || '';
}

/**
 * Hook to fetch multiple media items by their location keys
 */
export function useSiteMediaBatch(locationKeys: string[]) {
  return useQuery({
    queryKey: ['site-media-batch', ...locationKeys],
    queryFn: async (): Promise<Record<string, SiteMedia>> => {
      const { data, error } = await supabase
        .from('site_media')
        .select('*')
        .in('location_key', locationKeys)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching site media batch:', error);
        return {};
      }

      return (data || []).reduce((acc, item) => {
        acc[item.location_key] = item as SiteMedia;
        return acc;
      }, {} as Record<string, SiteMedia>);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get game cover images with fallbacks
 */
export function useGameCoverImages() {
  const locationKeys = ['ats_cover', 'farming_sim_cover', 'construction_sim_cover', 'mechanic_sim_cover'];
  const { data, isLoading } = useSiteMediaBatch(locationKeys);

  const gameCoverImages: Record<string, string> = {
    ATS: data?.ats_cover?.url || fallbackMedia.ats_cover,
    Farming_Sim: data?.farming_sim_cover?.url || fallbackMedia.farming_sim_cover,
    Construction_Sim: data?.construction_sim_cover?.url || fallbackMedia.construction_sim_cover,
    Mechanic_Sim: data?.mechanic_sim_cover?.url || fallbackMedia.mechanic_sim_cover,
  };

  return { gameCoverImages, isLoading };
}

/**
 * Hook to fetch all site media for admin management
 */
export function useAllSiteMedia() {
  return useQuery({
    queryKey: ['site-media-all'],
    queryFn: async (): Promise<SiteMedia[]> => {
      const { data, error } = await supabase
        .from('site_media')
        .select('*')
        .order('location_key');

      if (error) {
        console.error('Error fetching all site media:', error);
        return [];
      }

      return (data || []) as SiteMedia[];
    },
    staleTime: 30 * 1000, // More frequent updates for admin
  });
}
