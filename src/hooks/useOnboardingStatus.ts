import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface UserAddress {
  id: string;
  user_id: string;
  full_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  discord_id: string | null;
  is_validated: boolean;
  smarty_response: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SaveAddressInput {
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  discordId?: string;
  isValidated: boolean;
  smartyResponse?: unknown;
  overrideCodeId?: string;
  tenantId?: string;
}

export function useOnboardingStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userAddress, isLoading, error } = useQuery({
    queryKey: ['user-address', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user address:', error);
        throw error;
      }

      return data as UserAddress | null;
    },
    enabled: !!user?.id,
  });

  const saveAddressMutation = useMutation({
    mutationFn: async (input: SaveAddressInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const addressData = {
        user_id: user.id,
        full_name: input.fullName,
        street_address: input.streetAddress,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        discord_id: input.discordId ?? null,
        is_validated: input.isValidated,
        smarty_response: (input.smartyResponse ?? {}) as Json,
        override_code_id: input.overrideCodeId ?? null,
        tenant_id: input.tenantId ?? null,
      };

      // Check if user already has an address (update) or needs to create one
      const { data: existing } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data as UserAddress;
      } else {
        const { data, error } = await supabase
          .from('user_addresses')
          .insert(addressData)
          .select()
          .single();

        if (error) throw error;
        return data as UserAddress;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-address', user?.id] });
    },
  });

  const hasCompletedOnboarding = !!userAddress;

  return {
    userAddress,
    isLoading,
    error,
    hasCompletedOnboarding,
    saveAddress: saveAddressMutation.mutateAsync,
    isSaving: saveAddressMutation.isPending,
    saveError: saveAddressMutation.error,
  };
}
