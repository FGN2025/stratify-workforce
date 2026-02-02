import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  EventWithDetails, 
  EventRegistrationWithUser, 
  EventStatus, 
  EventType,
  RegistrationStatus 
} from '@/types/events';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

export function useEventById(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from('events')
        .select(`
          *,
          work_orders (
            id,
            title,
            description,
            game_title,
            xp_reward,
            difficulty,
            success_criteria,
            estimated_time_minutes
          )
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;

      // Get registration count
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id!)
        .eq('status', 'registered');

      // Get winner profile if exists
      let winnerProfile = null;
      if (event.winner_id) {
        const { data: profiles } = await supabase
          .rpc('get_public_profile_data', { profile_ids: [event.winner_id] });
        
        if (profiles && profiles.length > 0) {
          winnerProfile = {
            id: profiles[0].id,
            username: profiles[0].username,
            avatar_url: profiles[0].avatar_url,
          };
        }
      }

      return {
        id: event.id,
        work_order_id: event.work_order_id,
        title: event.title,
        description: event.description,
        event_type: event.event_type as EventType,
        scheduled_start: event.scheduled_start,
        scheduled_end: event.scheduled_end,
        registration_deadline: event.registration_deadline,
        min_participants: event.min_participants ?? 1,
        max_participants: event.max_participants,
        status: event.status as EventStatus,
        tenant_id: event.tenant_id,
        created_by: event.created_by,
        created_at: event.created_at,
        updated_at: event.updated_at,
        google_calendar_event_id: event.google_calendar_event_id,
        winner_id: event.winner_id,
        work_order: event.work_orders ? {
          id: event.work_orders.id,
          title: event.work_orders.title,
          game_title: event.work_orders.game_title as GameTitle,
          xp_reward: event.work_orders.xp_reward,
          difficulty: event.work_orders.difficulty,
        } : null,
        registration_count: count || 0,
        winner: winnerProfile,
      } as EventWithDetails;
    },
  });
}

export function useEventRegistrations(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-registrations', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId!)
        .eq('status', 'registered')
        .order('registered_at', { ascending: true });

      if (error) throw error;

      // Get profile data for registered users
      const userIds = (registrations || []).map(r => r.user_id);
      
      if (userIds.length === 0) {
        return [] as EventRegistrationWithUser[];
      }

      const { data: profiles } = await supabase
        .rpc('get_public_profile_data', { profile_ids: userIds });

      const profileMap: Record<string, { id: string; username: string | null; avatar_url: string | null }> = {};
      (profiles || []).forEach(p => {
        profileMap[p.id] = {
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
        };
      });

      return (registrations || []).map(reg => ({
        id: reg.id,
        event_id: reg.event_id,
        user_id: reg.user_id,
        registered_at: reg.registered_at,
        status: reg.status as RegistrationStatus,
        bracket_seed: reg.bracket_seed,
        profile: profileMap[reg.user_id],
      })) as EventRegistrationWithUser[];
    },
  });
}
