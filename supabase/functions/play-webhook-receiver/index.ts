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
    'authorization, x-client-info, apikey, content-type, x-play-signature, x-play-event, x-fgn-event, x-play-delivery-id, x-delivery-id, x-ecosystem-app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Canonical event names (dotted). Aliases from play's dispatcher map to these.
const SUPPORTED_EVENTS = new Set([
  'challenge.completed',
  'evidence.approved',
  'achievement.earned',
]);

const EVENT_ALIASES: Record<string, string> = {
  'challenge_completion': 'challenge.completed',
  'challenge.completion': 'challenge.completed',
  'evidence_approved': 'evidence.approved',
  'achievement_earned': 'achievement.earned',
};

function normalizeEvent(raw: string): string {
  const v = (raw ?? '').trim();
  return EVENT_ALIASES[v] ?? v;
}

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

// ---------------------------------------------------------------------------
// Identity + Skill Passport helpers (achievement.earned handler)
// ---------------------------------------------------------------------------

type SupabaseSvc = ReturnType<typeof createClient>;

type IdentityResolution =
  | { ok: true; userId: string; matchedBy: 'play_identity' | 'email' }
  | { ok: false; reason: string };

async function resolveIdentity(
  supabase: SupabaseSvc,
  externalUserId: string | null,
  email: string | null,
): Promise<IdentityResolution> {
  if (externalUserId) {
    const { data } = await supabase
      .from('play_identity')
      .select('user_id')
      .eq('external_user_id', externalUserId)
      .maybeSingle();
    if (data?.user_id) {
      await supabase
        .from('play_identity')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('external_user_id', externalUserId);
      return { ok: true, userId: data.user_id as string, matchedBy: 'play_identity' };
    }
  }
  if (email) {
    const { data: userId, error } = await supabase.rpc('get_user_id_by_email', { p_email: email });
    if (!error && userId) {
      if (externalUserId) {
        await supabase
          .from('play_identity')
          .upsert(
            {
              user_id: userId as string,
              external_user_id: externalUserId,
              email,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'external_user_id' },
          );
      }
      return { ok: true, userId: userId as string, matchedBy: 'email' };
    }
  }
  return { ok: false, reason: 'unmapped_identity' };
}

async function ensurePassport(supabase: SupabaseSvc, userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('skill_passport')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const hashSrc = `${userId}-${Date.now()}-${crypto.randomUUID()}`;
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashSrc));
  const passportHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const { data: created, error } = await supabase
    .from('skill_passport')
    .insert({ user_id: userId, passport_hash: passportHash })
    .select('id')
    .single();
  if (error) {
    console.error('[play-webhook-receiver] passport insert failed', error);
    return null;
  }
  return created.id as string;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function handleAchievementEarned(
  supabase: SupabaseSvc,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const user = (data.user as Record<string, unknown>) ?? {};
  const externalUserId =
    (user.external_user_id as string | null) ??
    (data.external_user_id as string | null) ?? null;
  const email = (user.email as string | null) ?? (data.user_email as string | null) ?? null;
  const externalRef = (data.achievement_id as string | null) ?? (data.id as string | null) ?? null;

  if (!externalRef) return { status: 400, body: { error: 'missing achievement_id' } };

  const ident = await resolveIdentity(supabase, externalUserId, email);
  if (!ident.ok) {
    return {
      status: 202,
      body: { credentialed: false, reason: ident.reason, external_user_id: externalUserId, email },
    };
  }

  const passportId = await ensurePassport(supabase, ident.userId);
  if (!passportId) return { status: 500, body: { error: 'passport upsert failed' } };

  const verificationHash = await sha256Hex(`fgn-play|${externalRef}|${passportId}`);
  const tenant = (data.tenant as Record<string, unknown>) ?? {};

  const credentialRow = {
    passport_id: passportId,
    credential_type: 'badge',
    credential_type_key: 'play_achievement',
    title: (data.name as string | null) ?? 'Play Achievement',
    issuer: 'play.fgn.gg',
    issuer_app_slug: 'fgn-play',
    source: 'external_api',
    external_reference_id: externalRef,
    skills_verified: Array.isArray(data.skills_verified) ? (data.skills_verified as string[]) : [],
    xp_earned: typeof data.xp_reward === 'number' ? (data.xp_reward as number) : 0,
    issued_at: (data.earned_at as string | null) ?? new Date().toISOString(),
    verification_hash: verificationHash,
    metadata: {
      ...data,
      _resolved: { matched_by: ident.matchedBy, external_user_id: externalUserId, email },
      _tenant: tenant,
    },
  };

  const { data: inserted, error } = await supabase
    .from('skill_credentials')
    .insert(credentialRow)
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      const { data: existing } = await supabase
        .from('skill_credentials')
        .select('id')
        .eq('passport_id', passportId)
        .eq('external_reference_id', externalRef)
        .eq('credential_type_key', 'play_achievement')
        .maybeSingle();
      return {
        status: 200,
        body: { credentialed: true, duplicate: true, credential_id: existing?.id ?? null },
      };
    }
    console.error('[play-webhook-receiver] credential insert failed', error);
    return { status: 500, body: { error: 'credential insert failed', detail: error.message } };
  }

  return { status: 200, body: { credentialed: true, credential_id: inserted.id, was_new: true } };
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

  // Play's final envelope: { event_type, payload, timestamp }.
  // We also still accept the legacy { event, data, delivery_id } shape and the
  // X-Play-Event / X-FGN-Event headers as fallbacks.
  const rawEvent =
    (payload.event_type as string | undefined) ??
    (payload.event as string | undefined) ??
    (payload.type as string | undefined) ??
    req.headers.get('x-fgn-event') ??
    req.headers.get('x-play-event') ??
    '';
  const eventType = normalizeEvent(rawEvent);
  const innerPayload =
    (payload.payload as Record<string, unknown> | undefined) ??
    (payload.data as Record<string, unknown> | undefined) ??
    payload;
  const deliveryId =
    (payload.delivery_id as string | undefined) ??
    (innerPayload.delivery_id as string | undefined) ??
    ((innerPayload.metadata as Record<string, unknown> | undefined)?.delivery_id as string | undefined) ??
    req.headers.get('x-delivery-id') ??
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
      const resp = await fetch(`${supabaseUrl}/functions/v1/sync-challenge-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ecosystem-Key': ecosystemKey,
          'X-Ecosystem-App': 'play-webhook',
        },
        body: JSON.stringify(innerPayload),
      });
      dispatchResult = { status: resp.status, body: await resp.json().catch(() => null) };
    } else if (eventType === 'achievement.earned') {
      dispatchResult = await handleAchievementEarned(supabase, innerPayload);
    } else {
      // evidence.approved — handler TODO; record only for now.
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
