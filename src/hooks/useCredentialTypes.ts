import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

export interface CredentialType {
  id: string;
  type_key: string;
  display_name: string;
  description: string | null;
  issuer_app_slug: string | null;
  game_title: GameTitle | null;
  skills_granted: string[];
  icon_name: string;
  accent_color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CredentialTypeInsert = Omit<CredentialType, 'id' | 'created_at' | 'updated_at'>;
export type CredentialTypeUpdate = Partial<CredentialTypeInsert>;

export function useCredentialTypes() {
  return useQuery({
    queryKey: ['credential-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credential_types')
        .select('*')
        .order('game_title', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CredentialType[];
    },
  });
}

export function useCredentialTypesByGame(gameTitle?: GameTitle) {
  return useQuery({
    queryKey: ['credential-types', gameTitle],
    queryFn: async () => {
      let query = supabase
        .from('credential_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (gameTitle) {
        query = query.eq('game_title', gameTitle);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CredentialType[];
    },
    enabled: gameTitle !== undefined,
  });
}

export function useCreateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credType: CredentialTypeInsert) => {
      const { data, error } = await supabase
        .from('credential_types')
        .insert(credType)
        .select()
        .single();

      if (error) throw error;
      return data as CredentialType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
      toast({
        title: 'Credential Type Created',
        description: 'New credential type has been added.',
      });
    },
    onError: (error) => {
      console.error('Error creating credential type:', error);
      toast({
        title: 'Error',
        description: 'Failed to create credential type.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CredentialTypeUpdate }) => {
      const { data, error } = await supabase
        .from('credential_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CredentialType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
      toast({
        title: 'Credential Type Updated',
        description: 'Credential type has been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating credential type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update credential type.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credential_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
      toast({
        title: 'Credential Type Deleted',
        description: 'Credential type has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting credential type:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete credential type.',
        variant: 'destructive',
      });
    },
  });
}