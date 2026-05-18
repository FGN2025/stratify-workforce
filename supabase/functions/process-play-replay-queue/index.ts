// Drains play_replay_queue: for each pending intent, finds matching
// play_sync_attempts rows (failed challenge.completed for a challenge_id, or
// unmapped_identity attempts for an email) and re-fires them through
// play-webhook-receiver with a valid HMAC signature so credentials are
// minted now that the blocking condition has cleared.
//
// Callers:
//   - pg_cron job (verify_jwt=false) — fires every 2 min
//   - Admin "Process replay queue" button (admin JWT)
//
// Idempotency: receiver dedupes on (action, delivery_id); we delete the prior
// attempt row before re-firing so the receiver actually processes the body.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const MAX_PER_RUN = 25;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const secret = Deno.env.get('PLAY_WEBHOOK_SECRET');
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: intents, error: intentsErr } = await supabase
    .from('play_replay_queue')
    .select('id, reason, email, challenge_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN);

  if (intentsErr) {
    console.error('[process-play-replay-queue] queue read failed', intentsErr);
    return new Response(JSON.stringify({ error: 'queue read failed', detail: intentsErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!intents || intents.length === 0) {
    return new Response(JSON.stringify({ ok: true, drained: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const intent of intents) {
    await supabase
      .from('play_replay_queue')
      .update({ status: 'processing' })
      .eq('id', intent.id);

    // Find matching attempts
    let query = supabase
      .from('play_sync_attempts')
      .select('id, action, external_attempt_id, request, response, status')
      .eq('direction', 'inbound')
      .order('created_at', { ascending: true })
      .limit(50);

    if (intent.email) {
      query = query
        .like('action', 'webhook:%')
        .filter('response->>reason', 'eq', 'unmapped_identity');
    } else if (intent.challenge_id) {
      query = query
        .eq('action', 'webhook:challenge.completed')
        .eq('status', 'failed');
    }

    const { data: attempts, error: attemptsErr } = await query;
    if (attemptsErr) {
      await supabase.from('play_replay_queue').update({
        status: 'failed', last_error: attemptsErr.message, processed_at: new Date().toISOString(),
      }).eq('id', intent.id);
      results.push({ intent_id: intent.id, ok: false, error: attemptsErr.message });
      continue;
    }

    // Filter further by email / challenge id inside request payload
    const matched = (attempts ?? []).filter((a) => {
      const req = (a.request as Record<string, unknown> | null) ?? {};
      const payload = ((req.payload as Record<string, unknown> | undefined) ?? req) as Record<string, unknown>;
      const inner = (payload.payload as Record<string, unknown> | undefined)
        ?? (payload.data as Record<string, unknown> | undefined)
        ?? payload;

      if (intent.email) {
        const resp = (a.response as Record<string, unknown> | null) ?? {};
        const respEmail = (resp.email as string | undefined)?.toLowerCase();
        if (respEmail && respEmail === intent.email.toLowerCase()) return true;
        const user = (inner.user as Record<string, unknown> | undefined) ?? {};
        const innerEmail = ((user.email as string | undefined)
          ?? (inner.user_email as string | undefined) ?? '').toLowerCase();
        return innerEmail === intent.email.toLowerCase();
      }
      if (intent.challenge_id) {
        const c = (inner.challenge_id as string | undefined)
          ?? (((inner.challenge as Record<string, unknown> | undefined)?.id) as string | undefined);
        return c === intent.challenge_id;
      }
      return false;
    });

    let replayed = 0;
    let firstError: string | null = null;

    for (const a of matched) {
      const reqObj = (a.request as Record<string, unknown> | null) ?? {};
      const originalPayload = (reqObj.payload as Record<string, unknown> | undefined) ?? reqObj;
      if (!originalPayload) continue;

      // Drop prior row so receiver actually processes
      await supabase.from('play_sync_attempts').delete().eq('id', a.id);

      const rawBody = JSON.stringify(originalPayload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Ecosystem-App': 'play-webhook',
        'X-Replay-Source': 'queue',
      };
      if (secret) headers['X-Play-Signature'] = await hmacHex(secret, rawBody);

      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/play-webhook-receiver`, {
          method: 'POST', headers, body: rawBody,
        });
        if (resp.ok) {
          replayed++;
        } else {
          const t = await resp.text().catch(() => '');
          firstError = firstError ?? `status=${resp.status} body=${t.slice(0, 200)}`;
        }
      } catch (err) {
        firstError = firstError ?? String(err);
      }
    }

    const finalStatus = matched.length === 0 ? 'skipped'
      : firstError ? 'failed' : 'done';

    await supabase.from('play_replay_queue').update({
      status: finalStatus,
      attempts_matched: matched.length,
      attempts_replayed: replayed,
      last_error: firstError,
      processed_at: new Date().toISOString(),
    }).eq('id', intent.id);

    results.push({
      intent_id: intent.id, reason: intent.reason,
      email: intent.email, challenge_id: intent.challenge_id,
      matched: matched.length, replayed, error: firstError,
    });
  }

  return new Response(JSON.stringify({ ok: true, drained: intents.length, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
