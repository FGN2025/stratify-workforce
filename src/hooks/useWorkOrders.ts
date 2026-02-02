import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useChannelSubscriptions } from './useChannelSubscriptions';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];
type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];

export interface WorkOrderWithXP {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  game_title: GameTitle;
  success_criteria: Record<string, number>;
  is_active: boolean;
  created_at: string;
  xp_reward: number;
  channel_id: string | null;
  difficulty: WorkOrderDifficulty;
  estimated_time_minutes: number | null;
  max_attempts: number | null;
  evidence_requirements: Record<string, unknown> | null;
}

export function useWorkOrders(filter?: 'all' | 'subscribed' | GameTitle) {
  const { tenant } = useTenant();
  const { subscribedGames } = useChannelSubscriptions();

  return useQuery({
    queryKey: ['work-orders', tenant?.id, filter, subscribedGames],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Filter by specific game title
      if (filter && filter !== 'all' && filter !== 'subscribed') {
        query = query.eq('game_title', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by tenant
      let filtered = (data || []).filter(
        wo => wo.tenant_id === null || wo.tenant_id === tenant?.id
      );

      // Filter by subscribed channels
      if (filter === 'subscribed' && subscribedGames.length > 0) {
        filtered = filtered.filter(wo => subscribedGames.includes(wo.game_title));
      }

      return filtered.map(wo => ({
        id: wo.id,
        tenant_id: wo.tenant_id,
        title: wo.title,
        description: wo.description,
        game_title: wo.game_title,
        success_criteria: (wo.success_criteria as Record<string, number>) || {},
        is_active: wo.is_active ?? true,
        created_at: wo.created_at,
        xp_reward: wo.xp_reward,
        channel_id: wo.channel_id,
        difficulty: wo.difficulty,
        estimated_time_minutes: wo.estimated_time_minutes,
        max_attempts: wo.max_attempts,
        evidence_requirements: (wo.evidence_requirements as Record<string, unknown>) || null,
      })) as WorkOrderWithXP[];
    },
  });
}

export function useWorkOrderById(id: string) {
  return useQuery({
    queryKey: ['work-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        tenant_id: data.tenant_id,
        title: data.title,
        description: data.description,
        game_title: data.game_title,
        success_criteria: (data.success_criteria as Record<string, number>) || {},
        is_active: data.is_active ?? true,
        created_at: data.created_at,
        xp_reward: data.xp_reward,
        channel_id: data.channel_id,
        difficulty: data.difficulty,
        estimated_time_minutes: data.estimated_time_minutes,
        max_attempts: data.max_attempts,
        evidence_requirements: (data.evidence_requirements as Record<string, unknown>) || null,
      } as WorkOrderWithXP;
    },
  });
}
