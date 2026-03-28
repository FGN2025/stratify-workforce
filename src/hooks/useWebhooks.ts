import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WebhookSubscription {
  id: string;
  app_slug: string;
  webhook_url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  event_type: string;
  payload: Record<string, any>;
  status_code: number | null;
  response_body: string | null;
  attempt_number: number;
  delivered_at: string | null;
  created_at: string;
}

export function useWebhookSubscriptions() {
  return useQuery({
    queryKey: ['webhook-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('id, app_slug, webhook_url, events, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WebhookSubscription[];
    },
  });
}

export function useWebhookDeliveries(subscriptionId: string | null) {
  return useQuery({
    queryKey: ['webhook-deliveries', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];
      const { data, error } = await supabase
        .from('webhook_delivery_log')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as WebhookDelivery[];
    },
    enabled: !!subscriptionId,
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] }),
  });
}
