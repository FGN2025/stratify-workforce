import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

export interface SimResource {
  id: string;
  game_title: GameTitle;
  title: string;
  description: string | null;
  href: string;
  icon_name: string;
  accent_color: string;
  media_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined media data
  media?: {
    url: string;
    alt_text: string | null;
  } | null;
}

export interface SimResourceInsert {
  game_title: GameTitle;
  title: string;
  description?: string | null;
  href: string;
  icon_name?: string;
  accent_color?: string;
  media_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface SimResourceUpdate extends Partial<SimResourceInsert> {
  id: string;
}

// Fetch resources for a specific game (public, active only)
export function useSimResources(gameTitle?: GameTitle) {
  return useQuery({
    queryKey: ['sim-resources', gameTitle],
    queryFn: async () => {
      let query = supabase
        .from('sim_resources')
        .select(`
          *,
          media:site_media(url, alt_text)
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (gameTitle) {
        query = query.eq('game_title', gameTitle);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SimResource[];
    },
  });
}

// Fetch all resources for admin (including inactive)
export function useAllSimResources() {
  return useQuery({
    queryKey: ['sim-resources', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sim_resources')
        .select(`
          *,
          media:site_media(url, alt_text)
        `)
        .order('game_title', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SimResource[];
    },
  });
}

// CRUD mutations
export function useSimResourceMutations() {
  const queryClient = useQueryClient();

  const createResource = useMutation({
    mutationFn: async (resource: SimResourceInsert) => {
      const { data, error } = await supabase
        .from('sim_resources')
        .insert(resource)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-resources'] });
      toast({
        title: 'Resource Created',
        description: 'The SIM resource has been added successfully.',
      });
    },
    onError: (error) => {
      console.error('Error creating resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to create resource.',
        variant: 'destructive',
      });
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, ...updates }: SimResourceUpdate) => {
      const { data, error } = await supabase
        .from('sim_resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-resources'] });
      toast({
        title: 'Resource Updated',
        description: 'The SIM resource has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to update resource.',
        variant: 'destructive',
      });
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sim_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-resources'] });
      toast({
        title: 'Resource Deleted',
        description: 'The SIM resource has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete resource.',
        variant: 'destructive',
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('sim_resources')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sim-resources'] });
      toast({
        title: data.is_active ? 'Resource Activated' : 'Resource Deactivated',
        description: `"${data.title}" is now ${data.is_active ? 'visible' : 'hidden'}.`,
      });
    },
    onError: (error) => {
      console.error('Error toggling resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to update resource status.',
        variant: 'destructive',
      });
    },
  });

  const reorderResources = useMutation({
    mutationFn: async (orderedIds: { id: string; sort_order: number }[]) => {
      // Update each resource's sort_order
      const updates = orderedIds.map(({ id, sort_order }) =>
        supabase
          .from('sim_resources')
          .update({ sort_order })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-resources'] });
    },
    onError: (error) => {
      console.error('Error reordering resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder resources.',
        variant: 'destructive',
      });
    },
  });

  return {
    createResource,
    updateResource,
    deleteResource,
    toggleActive,
    reorderResources,
  };
}
