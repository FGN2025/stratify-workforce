import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AuthorizedApp {
  id: string;
  app_name: string;
  app_slug: string;
  api_key_hash: string;
  allowed_origins: string[];
  can_read_credentials: boolean;
  can_issue_credentials: boolean;
  credential_types_allowed: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AuthorizedAppInsert = Omit<AuthorizedApp, 'id' | 'created_at' | 'updated_at' | 'api_key_hash'>;
export type AuthorizedAppUpdate = Partial<AuthorizedAppInsert>;

export function useAuthorizedApps() {
  return useQuery({
    queryKey: ['authorized-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authorized_apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuthorizedApp[];
    },
  });
}

export function useCreateAuthorizedApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (app: AuthorizedAppInsert) => {
      // Get the current user's ID for owner_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First create with a placeholder hash and set owner_id
      const { data, error } = await supabase
        .from('authorized_apps')
        .insert({
          ...app,
          api_key_hash: 'pending', // Will be replaced by generate function
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate the actual API key
      const { data: apiKey, error: keyError } = await supabase
        .rpc('generate_app_api_key', { p_app_id: data.id });

      if (keyError) throw keyError;

      return { app: data as AuthorizedApp, apiKey: apiKey as string };
    },
    onSuccess: ({ apiKey }) => {
      queryClient.invalidateQueries({ queryKey: ['authorized-apps'] });
      toast({
        title: 'App Created',
        description: 'Make sure to copy the API key - it won\'t be shown again!',
      });
      return apiKey;
    },
    onError: (error) => {
      console.error('Error creating app:', error);
      toast({
        title: 'Error',
        description: 'Failed to create authorized app.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAuthorizedApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AuthorizedAppUpdate }) => {
      const { data, error } = await supabase
        .from('authorized_apps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AuthorizedApp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorized-apps'] });
      toast({
        title: 'App Updated',
        description: 'Authorized app has been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating app:', error);
      toast({
        title: 'Error',
        description: 'Failed to update authorized app.',
        variant: 'destructive',
      });
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: string) => {
      const { data: apiKey, error } = await supabase
        .rpc('generate_app_api_key', { p_app_id: appId });

      if (error) throw error;
      return apiKey as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorized-apps'] });
      toast({
        title: 'API Key Regenerated',
        description: 'Make sure to copy the new API key - it won\'t be shown again!',
      });
    },
    onError: (error) => {
      console.error('Error regenerating key:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate API key.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAuthorizedApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('authorized_apps')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorized-apps'] });
      toast({
        title: 'App Deleted',
        description: 'Authorized app has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting app:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete authorized app.',
        variant: 'destructive',
      });
    },
  });
}