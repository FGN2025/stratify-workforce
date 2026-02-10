import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types for the AI config tables (not in generated types yet)
export interface AIModelConfig {
  id: string;
  model_id: string;
  display_name: string;
  provider: string;
  is_enabled: boolean;
  is_default: boolean;
  use_for: string[];
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface AIPersonaConfig {
  id: string;
  context_type: string;
  persona_name: string;
  system_prompt: string;
  model_override: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIPlatformSetting {
  key: string;
  value: any;
  updated_at: string;
  updated_by: string | null;
}

export function useAIModels() {
  return useQuery({
    queryKey: ['ai-model-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_configs' as any)
        .select('*')
        .order('provider', { ascending: true });
      if (error) throw error;
      return data as unknown as AIModelConfig[];
    },
  });
}

export function useAIPersonas() {
  return useQuery({
    queryKey: ['ai-persona-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_persona_configs' as any)
        .select('*')
        .order('context_type', { ascending: true });
      if (error) throw error;
      return data as unknown as AIPersonaConfig[];
    },
  });
}

export function useAIPlatformSettings() {
  return useQuery({
    queryKey: ['ai-platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_platform_settings' as any)
        .select('*');
      if (error) throw error;
      return data as unknown as AIPlatformSetting[];
    },
  });
}

export function useUpdateAIModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AIModelConfig> }) => {
      const { error } = await supabase
        .from('ai_model_configs' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-model-configs'] });
      toast({ title: 'Model updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAIPersona() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AIPersonaConfig> }) => {
      const { error } = await supabase
        .from('ai_persona_configs' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-persona-configs'] });
      toast({ title: 'Persona updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAIPlatformSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('ai_platform_settings' as any)
        .update({ value, updated_at: new Date().toISOString() } as any)
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-platform-settings'] });
      toast({ title: 'Setting updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
