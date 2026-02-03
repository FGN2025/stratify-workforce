import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { RegistrationStatus } from '@/types/events';

export function useEventRegistration(eventId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is registered for this event
  const { data: registration, isLoading } = useQuery({
    queryKey: ['event-registration', eventId, user?.id],
    enabled: !!eventId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        event_id: data.event_id,
        user_id: data.user_id,
        registered_at: data.registered_at,
        status: data.status as RegistrationStatus,
        bracket_seed: data.bracket_seed,
      };
    },
  });

  // Register for event
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !eventId) {
        throw new Error('Must be logged in to register');
      }

      // Check if there's an existing registration (could be cancelled)
      const { data: existing } = await supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // If already registered, don't allow duplicate
        if (existing.status === 'registered') {
          throw new Error('You are already registered for this event');
        }
        // Re-activate cancelled registration
        const { data, error } = await supabase
          .from('event_registrations')
          .update({ status: 'registered', registered_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // New registration
      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You are already registered for this event');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Registered!',
        description: 'You have successfully registered for this event.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel registration
  const unregisterMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !eventId) {
        throw new Error('Must be logged in');
      }

      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Registration cancelled',
        description: 'You have cancelled your registration for this event.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancellation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isRegistered = registration?.status === 'registered';
  const wasCancelled = registration?.status === 'cancelled';

  return {
    registration,
    isLoading,
    isRegistered,
    wasCancelled,
    register: registerMutation.mutate,
    unregister: unregisterMutation.mutate,
    isRegistering: registerMutation.isPending,
    isUnregistering: unregisterMutation.isPending,
  };
}
