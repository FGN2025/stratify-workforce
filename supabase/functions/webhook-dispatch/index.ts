import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Webhook Dispatch Function
 * Called internally (service role) to dispatch webhook events.
 * Supports: credential.issued, readiness.threshold, work_order.completed
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow service role calls
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '___none___')) {
    // Also accept calls from other edge functions with service key
    const apiKey = req.headers.get('apikey');
    if (apiKey !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { event_type, payload } = await req.json();

    if (!event_type || !payload) {
      return new Response(JSON.stringify({ error: 'event_type and payload are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find active subscriptions for this event
    const { data: subs, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, webhook_url, secret')
      .filter('events', 'cs', `{${event_type}}`)
      .eq('is_active', true);

    if (error) throw error;
    if (!subs?.length) {
      return new Response(JSON.stringify({ dispatched: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = JSON.stringify({ event: event_type, timestamp: new Date().toISOString(), data: payload });
    let dispatched = 0;

    for (const sub of subs) {
      try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(sub.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
        const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

        const resp = await fetch(sub.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Event': event_type },
          body,
        });

        await supabase.from('webhook_delivery_log').insert({
          subscription_id: sub.id,
          event_type,
          payload,
          status_code: resp.status,
          response_body: (await resp.text()).substring(0, 1000),
          delivered_at: new Date().toISOString(),
        });

        dispatched++;
      } catch (err) {
        await supabase.from('webhook_delivery_log').insert({
          subscription_id: sub.id,
          event_type,
          payload,
          status_code: 0,
          response_body: err instanceof Error ? err.message : 'Delivery failed',
        });
      }
    }

    return new Response(
      JSON.stringify({ dispatched, total_subscriptions: subs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Webhook dispatch error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
