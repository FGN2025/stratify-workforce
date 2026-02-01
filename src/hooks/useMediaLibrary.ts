import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SiteMedia } from './useSiteMedia';

type MediaType = 'image' | 'video' | 'youtube' | 'audio';

interface CreateMediaParams {
  location_key: string;
  media_type: MediaType;
  url: string;
  title: string;
  alt_text?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateMediaParams {
  id: string;
  url?: string;
  title?: string;
  alt_text?: string;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

interface UploadFileParams {
  file: File;
  folder: string;
}

/**
 * Hook for media library CRUD operations
 */
export function useMediaLibrary() {
  const queryClient = useQueryClient();

  const createMedia = useMutation({
    mutationFn: async (params: CreateMediaParams) => {
      const insertData = {
        location_key: params.location_key,
        media_type: params.media_type,
        url: params.url,
        title: params.title,
        alt_text: params.alt_text || null,
        metadata: (params.metadata || {}) as Record<string, unknown>,
      };
      
      const { data, error } = await supabase
        .from('site_media')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as SiteMedia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-media-all'] });
      toast({
        title: 'Media Added',
        description: 'New media has been added successfully.',
      });
    },
    onError: (error) => {
      console.error('Error creating media:', error);
      toast({
        title: 'Error',
        description: 'Failed to add media. Make sure you have admin permissions.',
        variant: 'destructive',
      });
    },
  });

  const updateMedia = useMutation({
    mutationFn: async (params: UpdateMediaParams) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('site_media')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SiteMedia;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['site-media-all'] });
      queryClient.invalidateQueries({ queryKey: ['site-media', data.location_key] });
      queryClient.invalidateQueries({ queryKey: ['site-media-batch'] });
      toast({
        title: 'Media Updated',
        description: 'Media has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating media:', error);
      toast({
        title: 'Error',
        description: 'Failed to update media.',
        variant: 'destructive',
      });
    },
  });

  const deleteMedia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('site_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-media-all'] });
      queryClient.invalidateQueries({ queryKey: ['site-media'] });
      queryClient.invalidateQueries({ queryKey: ['site-media-batch'] });
      toast({
        title: 'Media Deleted',
        description: 'Media has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting media:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete media.',
        variant: 'destructive',
      });
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, folder }: UploadFileParams) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file. Make sure you have admin permissions.',
        variant: 'destructive',
      });
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (filePath: string) => {
      // Extract path from full URL if needed
      const path = filePath.includes('media-assets/')
        ? filePath.split('media-assets/')[1]
        : filePath;

      const { error } = await supabase.storage
        .from('media-assets')
        .remove([path]);

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete file from storage.',
        variant: 'destructive',
      });
    },
  });

  return {
    createMedia,
    updateMedia,
    deleteMedia,
    uploadFile,
    deleteFile,
  };
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/, // Already just an ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1] || match[0];
  }

  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
