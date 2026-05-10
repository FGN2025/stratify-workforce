// Phase E scaffolding — receiver for play.fgn.gg ecosystem-webhook-dispatch.
//
// Status: PLUMBING ONLY. The HMAC verifier is a stub until play answers
// open ask #5 (header name + canonical string format). Until then:
//   - If PLAY_WEBHOOK_SECRET is unset: accept all requests, log a warning,
//     mark the play_sync_attempts row with status='queued' + metadata.unsigned=true.
//   - If PLAY_WEBHOOK_SECRET is set AND PLAY_WEBHOOK_STRICT=true: require a
//     valid signature (current scheme: HMAC-SHA256 over raw body, hex-encoded,
//     in header `x-play-signature`). Swap the canonical string + header name
//     in `verifySignature` when play confirms.
//   - If PLAY_WEBHOOK_SECRET is set AND strict=false: log mismatch but accept.
//
// Supported event types: challenge.completed, evidence.approved, achievement.earned.
// All events are recorded in play_sync_attempts. challenge.completed is forwarded
// to sync-challenge-completion (which holds all the existing track/credential logic).
//
// Once play registers us in their Outbound Webhooks, the URL to give them is:
//   https://<project-ref>.supabase.co/functions/v1/play-webhook-receiver

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-play-signature, x-play-event, x-play-delivery-id, x-ecosystem-app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPPORTED_EVENTS = new Set([
  'challenge.completed',
  'evidence.approved',
  'achievement.earned',
]);

type VerifyResult = {
  ok: boolean;
  mode: 'unsigned' | 'strict' | 'lenient';
  reason?: string;
};

// Per-source HMAC secret lookup. Defaults to PLAY_WEBHOOK_SECRET so the existing
// Play deployment keeps working; future sources (e.g. broadbandworkforce.com) set
// X-Ecosystem-App to a known slug and we look up the matching secret env var.
const SOURCE_SECRET_ENV: Record<string, string> = {
  'play-webhook': 'PLAY_WEBHOOK_SECRET',
  'play': 'PLAY_WEBHOOK_SECRET',
  'bbw-webhook': 'BBW_WEBHOOK_SECRET',
  'broadband': 'BBW_WEBHOOK_SECRET',
};

async function verifySignature(rawBody: string, headers: Headers): Promise<VerifyResult> {
  const sourceApp = (headers.get('x-ecosystem-app') ?? 'play-webhook').toLowerCase();
  const envName = SOURCE_SECRET_ENV[sourceApp] ?? 'PLAY_WEBHOOK_SECRET';
  const secret = Deno.env.get(envName);
  const strict = (Deno.env.get('PLAY_WEBHOOK_STRICT') ?? 'false').toLowerCase() === 'true';

  if (!secret) {
    return { ok: true, mode: 'unsigned', reason: `${envName} not configured` };
  }

  // STUB SCHEME — replace when play confirms HMAC contract:
  //   header: x-play-signature
  //   value:  hex(hmac_sha256(secret, rawBody))
  const provided = headers.get('x-play-signature') ?? '';

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const ok = timingSafeEqual(provided, expected);
    if (ok) return { ok: true, mode: strict ? 'strict' : 'lenient' };
    if (strict) return { ok: false, mode: 'strict', reason: 'signature mismatch' };
    return { ok: true, mode: 'lenient', reason: 'signature mismatch (lenient mode)' };
  } catch (err) {
    if (strict) return { ok: false, mode: 'strict', reason: `verify failed: ${err}` };
    return { ok: true, mode: 'lenient', reason: `verify failed: ${err}` };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const rawBody = await req.text();
  const verify = await verifySignature(rawBody, req.headers);

  if (!verify.ok) {
    console.warn('[play-webhook-receiver] signature rejected', verify);
    return new Response(JSON.stringify({ error: 'invalid signature', detail: verify.reason }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const eventType =
    (payload.event as string | undefined) ??
    (payload.type as string | undefined) ??
    req.headers.get('x-play-event') ??
    '';
  const deliveryId =
    (payload.delivery_id as string | undefined) ??
    req.headers.get('x-play-delivery-id') ??
    null;

  if (!SUPPORTED_EVENTS.has(eventType)) {
    console.warn('[play-webhook-receiver] unsupported event', eventType);
    await supabase.from('play_sync_attempts').insert({
      direction: 'inbound',
      action: `webhook:${eventType || 'unknown'}`,
      external_attempt_id: deliveryId,
      status: 'failed',
      request: payload,
      error: `unsupported event type: ${eventType}`,
    });
    return new Response(JSON.stringify({ error: 'unsupported event', event: eventType }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Idempotency: if delivery_id already seen for this action, return duplicate.
  if (deliveryId) {
    const { data: existing } = await supabase
      .from('play_sync_attempts')
      .select('id, status, response')
      .eq('action', `webhook:${eventType}`)
      .eq('external_attempt_id', deliveryId)
      .maybeSingle();
    if (existing) {
      console.log('[play-webhook-receiver] duplicate delivery', { eventType, deliveryId });
      return new Response(
        JSON.stringify({ duplicate: true, attempt_id: existing.id, status: existing.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('play_sync_attempts')
    .insert({
      direction: 'inbound',
      action: `webhook:${eventType}`,
      external_attempt_id: deliveryId,
      status: 'queued',
      request: { headers_event: eventType, sig_mode: verify.mode, payload },
    })
    .select('id')
    .single();

  if (attemptError) {
    console.error('[play-webhook-receiver] attempts insert failed', attemptError);
    return new Response(JSON.stringify({ error: 'failed to record attempt' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Dispatch
  let dispatchResult: { status: number; body: unknown } = { status: 202, body: { dispatched: false } };
  try {
    if (eventType === 'challenge.completed') {
      // Forward to the existing receiver, which already owns the heavy lifting.
      const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');
      if (!ecosystemKey) throw new Error('ECOSYSTEM_API_KEY not configured');
      const forwardBody = (payload.data as Record<string, unknown>) ?? payload;
      const resp = await fetch(`${supabaseUrl}/functions/v1/sync-challenge-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ecosystem-Key': ecosystemKey,
          'X-Ecosystem-App': 'play-webhook',
        },
        body: JSON.stringify(forwardBody),
      });
      dispatchResult = { status: resp.status, body: await resp.json().catch(() => null) };
    } else {
      // evidence.approved / achievement.earned — handlers TODO; record only for now.
      console.log('[play-webhook-receiver] received (handler pending)', eventType);
      dispatchResult = { status: 202, body: { dispatched: false, note: 'handler pending' } };
    }
  } catch (err) {
    console.error('[play-webhook-receiver] dispatch failed', err);
    await supabase
      .from('play_sync_attempts')
      .update({ status: 'failed', response: dispatchResult.body, error: String(err) })
      .eq('id', attempt.id);
    return new Response(JSON.stringify({ error: 'dispatch failed', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const finalStatus =
    dispatchResult.status >= 200 && dispatchResult.status < 300 ? 'completed' : 'failed';
  await supabase
    .from('play_sync_attempts')
    .update({ status: finalStatus, response: dispatchResult.body })
    .eq('id', attempt.id);

  return new Response(
    JSON.stringify({
      ok: true,
      attempt_id: attempt.id,
      event: eventType,
      sig_mode: verify.mode,
      dispatch_status: dispatchResult.status,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
