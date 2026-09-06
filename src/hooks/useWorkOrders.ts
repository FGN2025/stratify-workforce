import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChannelSubscriptions } from './useChannelSubscriptions';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];
type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];

export interface WorkOrderWithXP {
  id: string;
  tenant_id: string | null;
  title: string | null;
  generated_name: string | null;
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
  cover_image_url: string | null;
  source_challenge_id: string | null;
  fgn_origin_challenge_id: string | null;
  metadata: Record<string, unknown> | null;
}

export function useWorkOrders(filter?: 'all' | 'subscribed' | GameTitle) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { subscribedGames } = useChannelSubscriptions();

  return useQuery({
    queryKey: ['work-orders', tenant?.id, filter, subscribedGames, user?.id ? 'auth' : 'anon'],
    queryFn: async () => {
      // Signed-out visitors read the safe public projection (no scoring,
      // evidence, or integration internals). Curation is applied in the view.
      let query = user
        ? supabase.from('work_orders').select('*').eq('is_active', true)
        : supabase.from('public_work_orders').select('*');

      query = query.order('created_at', { ascending: false });

      // Filter by specific game title
      if (filter && filter !== 'all' && filter !== 'subscribed') {
        query = query.eq('game_title', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Tenant visibility is enforced by RLS via is_work_order_visible().
      // Client only filters by user-facing channel subscription preference.
      const rows = (data || []) as Record<string, unknown>[];
      let filtered = rows;

      if (filter === 'subscribed' && subscribedGames.length > 0) {
        filtered = filtered.filter(wo => subscribedGames.includes(wo.game_title as GameTitle));
      }


      return filtered.map(wo => ({
        id: wo.id as string,
        tenant_id: (wo.tenant_id as string | null) ?? null,
        title: (wo.title as string | null) ?? null,
        generated_name: (wo.generated_name as string | null) ?? null,
        description: (wo.description as string | null) ?? null,
        game_title: wo.game_title as GameTitle,
        success_criteria: (wo.success_criteria as Record<string, number>) || {},
        is_active: (wo.is_active as boolean | null) ?? true,
        created_at: wo.created_at as string,
        xp_reward: (wo.xp_reward as number | null) ?? 0,
        channel_id: (wo.channel_id as string | null) ?? null,
        difficulty: wo.difficulty as WorkOrderDifficulty,
        estimated_time_minutes: (wo.estimated_time_minutes as number | null) ?? null,
        max_attempts: (wo.max_attempts as number | null) ?? null,
        evidence_requirements: (wo.evidence_requirements as Record<string, unknown>) || null,
        cover_image_url: (wo.cover_image_url as string | null) ?? null,
        source_challenge_id: (wo.source_challenge_id as string | null) ?? null,
        fgn_origin_challenge_id: (wo.fgn_origin_challenge_id as string | null) ?? null,
        metadata: (wo.metadata as Record<string, unknown> | null) ?? null,
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
        generated_name: (data as { generated_name?: string | null }).generated_name ?? null,
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
        cover_image_url: data.cover_image_url,
        source_challenge_id: data.source_challenge_id,
        fgn_origin_challenge_id: data.fgn_origin_challenge_id,
        metadata: (data.metadata as Record<string, unknown> | null) ?? null,
      } as WorkOrderWithXP;
    },
  });
}
