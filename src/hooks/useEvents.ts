import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { EventWithDetails, EventFilters, EventStatus, EventType } from '@/types/events';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

export function useEvents(filters?: EventFilters) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['events', tenant?.id, filters],
    queryFn: async () => {
      // First get events
      let query = supabase
        .from('events')
        .select(`
          *,
          work_orders (
            id,
            title,
            game_title,
            xp_reward,
            difficulty
          )
        `)
        .order('scheduled_start', { ascending: true });

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else {
        // By default, don't show draft events to non-admins
        query = query.neq('status', 'draft');
      }

      // Apply event type filter
      if (filters?.event_type && filters.event_type !== 'all') {
        query = query.eq('event_type', filters.event_type);
      }

      // Apply date range filters
      if (filters?.date_from) {
        query = query.gte('scheduled_start', filters.date_from.toISOString());
      }
      if (filters?.date_to) {
        query = query.lte('scheduled_start', filters.date_to.toISOString());
      }

      const { data: events, error } = await query;

      if (error) throw error;

      // Filter by tenant (show global events + tenant-specific)
      let filtered = (events || []).filter(
        event => event.tenant_id === null || event.tenant_id === tenant?.id
      );

      // Filter by game title if specified (via work order)
      if (filters?.game_title && filters.game_title !== 'all') {
        filtered = filtered.filter(
          event => event.work_orders?.game_title === filters.game_title
        );
      }

      // Get registration counts for each event
      const eventIds = filtered.map(e => e.id);
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'registered');

      // Count registrations per event
      const regCounts: Record<string, number> = {};
      (registrations || []).forEach(reg => {
        regCounts[reg.event_id] = (regCounts[reg.event_id] || 0) + 1;
      });

      return filtered.map(event => ({
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
        work_order: event.work_orders ? {
          id: event.work_orders.id,
          title: event.work_orders.title,
          game_title: event.work_orders.game_title as GameTitle,
          xp_reward: event.work_orders.xp_reward,
          difficulty: event.work_orders.difficulty,
        } : null,
        registration_count: regCounts[event.id] || 0,
      })) as EventWithDetails[];
    },
  });
}

export function useUpcomingEvents(limit = 5) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['upcoming-events', tenant?.id, limit],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          work_orders (
            id,
            title,
            game_title,
            xp_reward,
            difficulty
          )
        `)
        .in('status', ['published', 'registration_open', 'in_progress'])
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Filter by tenant
      const filtered = (events || []).filter(
        event => event.tenant_id === null || event.tenant_id === tenant?.id
      );

      return filtered.map(event => ({
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
        work_order: event.work_orders ? {
          id: event.work_orders.id,
          title: event.work_orders.title,
          game_title: event.work_orders.game_title as GameTitle,
          xp_reward: event.work_orders.xp_reward,
          difficulty: event.work_orders.difficulty,
        } : null,
      })) as EventWithDetails[];
    },
  });
}

export function useEventsByDate(date: Date) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['events-by-date', tenant?.id, date.toDateString()],
    queryFn: async () => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          work_orders (
            id,
            title,
            game_title,
            xp_reward,
            difficulty
          )
        `)
        .neq('status', 'draft')
        .gte('scheduled_start', startOfDay.toISOString())
        .lte('scheduled_start', endOfDay.toISOString())
        .order('scheduled_start', { ascending: true });

      if (error) throw error;

      // Filter by tenant
      const filtered = (events || []).filter(
        event => event.tenant_id === null || event.tenant_id === tenant?.id
      );

      return filtered.map(event => ({
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
        work_order: event.work_orders ? {
          id: event.work_orders.id,
          title: event.work_orders.title,
          game_title: event.work_orders.game_title as GameTitle,
          xp_reward: event.work_orders.xp_reward,
          difficulty: event.work_orders.difficulty,
        } : null,
      })) as EventWithDetails[];
    },
  });
}
