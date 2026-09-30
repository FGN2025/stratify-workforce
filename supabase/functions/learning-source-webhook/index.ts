// Generic learning-source webhook receiver (Phase G0).
//
// Resolves the source from `X-Learning-Source` header (slug from
// `learning_sources.slug`), verifies HMAC against the per-source secret env
// var, then dispatches to the shared handlers. The existing
// `play-webhook-receiver` keeps running for Play traffic during the cutover.
//
// Required headers:
//   X-Learning-Source: <slug>           (e.g. "play", "bbw")
//   X-Learning-Source-Signature: <hex>  (HMAC-SHA256 of raw body, hex)
//   Content-Type: application/json
//
// Optional headers:
//   X-Delivery-Id: <opaque>             (idempotency key)
//
// Body envelope:
//   { "event_type": "achievement.earned", "payload": {...}, "timestamp": "..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  handleAchievementEarned,
  handleEvidenceApproved,
  normalizeEvent,
  resolveSource,
  SUPPORTED_EVENTS,
  verifySignature,
  sanitizeSkillTags,
  EVIDENCE_APPROVED_ENABLED,
  EVIDENCE_NOT_ENABLED_BODY,
} from '../_shared/learning-source/handlers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-learning-source, x-learning-source-signature, x-delivery-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  const slug = (req.headers.get('x-learning-source') ?? '').trim().toLowerCase();
  if (!slug) {
    return new Response(JSON.stringify({ error: 'missing X-Learning-Source header' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const source = await resolveSource(supabase, slug);
  if (!source) {
    return new Response(JSON.stringify({ error: 'unknown or inactive learning source', slug }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();

  // Pull-only sources never accept pushes (contract inventory §1).
  if (source.ingestion_mode === 'pull') {
    await supabase.from('learning_source_pull_attempts').insert({
      source_slug: source.slug,
      direction: 'inbound',
      action: 'webhook:rejected',
      status: 'failed',
      request: { body_len: rawBody.length },
      error: 'source_is_pull_only',
    });
    return new Response(JSON.stringify({ error: 'source_is_pull_only', slug: source.slug }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const verify = await verifySignature(
    source,
    rawBody,
    req.headers.get('x-learning-source-signature'),
  );
  if (!verify.ok) {
    if (verify.reason === 'signing_secret_unconfigured') {
      await supabase.from('learning_source_pull_attempts').insert({
        source_slug: source.slug,
        direction: 'inbound',
        action: 'webhook:rejected',
        status: 'failed',
        request: { body_len: rawBody.length },
        error: 'signing_secret_unconfigured',
      });
      return new Response(JSON.stringify({ error: 'signing_secret_unconfigured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

  const rawEvent =
    (payload.event_type as string | undefined) ??
    (payload.event as string | undefined) ??
    (payload.type as string | undefined) ??
    '';
  const eventType = normalizeEvent(rawEvent);
  const innerPayload =
    (payload.payload as Record<string, unknown> | undefined) ??
    (payload.data as Record<string, unknown> | undefined) ??
    payload;
  const deliveryId =
    (payload.delivery_id as string | undefined) ??
    req.headers.get('x-delivery-id') ??
    null;

  if (!SUPPORTED_EVENTS.has(eventType)) {
    await supabase.from('learning_source_pull_attempts').insert({
      source_slug: source.slug,
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

  // Signature must be positively verified for any learner outcome (review
  // 2026-09-30 P0). Lenient mismatches and unsigned pushes are record-only.
  const signatureVerified = verify.ok && !verify.reason;

  // Atomic claim (review clarification 2): a unique index on
  // (source, action, delivery id) plus a single DB step. Repeated deliveries:
  //   completed / supporting_evidence -> acknowledge, no new outcome
  //   failed      -> re-claimed on the same row, prior error kept in history
  //   unmapped    -> stays pending for identity recovery
  //   quarantined / shadow -> acknowledged as recorded, never a completion
  //   processing  -> 409, a concurrent request cannot process it twice
  const { data: claimRows, error: claimErr } = await supabase.rpc('claim_learning_source_attempt', {
    p_source_slug: source.slug,
    p_action: `webhook:${eventType}`,
    p_delivery_id: deliveryId,
    p_request: { sig_mode: verify.mode, payload },
  });
  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (claimErr || !claim) {
    return new Response(JSON.stringify({ error: 'failed to record attempt' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!claim.claimed) {
    const prior = claim.prior_status as string;
    const inFlight = prior === 'processing' || prior === 'queued';
    return new Response(
      JSON.stringify({
        duplicate: true,
        attempt_id: claim.attempt_id,
        status: prior,
        learner_outcome: prior === 'completed',
      }),
      {
        status: inFlight ? 409 : 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // In-flight: retry later with the SAME delivery id.
          ...(inFlight ? { 'Retry-After': '30' } : {}),
        },
      },
    );
  }
  const attempt = { id: claim.attempt_id as string };

  const recordOnly = async (status: string, reason: string, extra: Record<string, unknown> = {}) => {
    await supabase
      .from('learning_source_pull_attempts')
      .update({ status, response: { reason, event: eventType, ...extra } })
      .eq('id', attempt.id);
    return new Response(
      JSON.stringify({ ok: true, recorded: true, status, reason, source: source.slug, event: eventType, attempt_id: attempt.id }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  };

  // Clarification 1: unverified deliveries are quarantined operational logs.
  // They never create evidence, resolve identities, update progress or replay.
  if (!signatureVerified) {
    return await recordOnly('quarantined', 'signature_not_verified', { detail: verify.reason });
  }
  if (source.shadow_mode) return await recordOnly('shadow', 'shadow_mode');

  // Decision 4: authenticated partner evidence approvals become exactly one
  // supporting-evidence record — zero credentials, zero XP.
  if (eventType === 'evidence.approved' && !EVIDENCE_APPROVED_ENABLED) {
    return await recordOnly('supporting_evidence', 'supporting_evidence_only', {
      credentialed: false,
      xp: 0,
      evidence_id: (innerPayload as Record<string, unknown>).evidence_id ?? null,
    });
  }

  let dispatch: { status: number; body: unknown } = { status: 202, body: { dispatched: false } };
  try {
    if (eventType === 'achievement.earned' || eventType === 'enrollment.completed') {
      dispatch = await handleAchievementEarned(supabase, source, innerPayload);
    } else if (eventType === 'evidence.approved') {
      dispatch = await handleEvidenceApproved(supabase, source, innerPayload);
    } else if (eventType === 'challenge.completed') {
      // Sanitize tags per source then forward to existing sync-challenge-completion.
      const tagged = sanitizeSkillTags(
        source.skill_tag_pattern,
        (innerPayload as Record<string, unknown>).skills_verified,
      );
      const forward = { ...innerPayload, skills_verified: tagged.kept, _dropped_tags: tagged.dropped };
      const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');
      const resp = await fetch(`${supabaseUrl}/functions/v1/sync-challenge-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ecosystem-Key': ecosystemKey ?? '',
          'X-Ecosystem-App': source.slug,
        },
        body: JSON.stringify(forward),
      });
      dispatch = { status: resp.status, body: await resp.json().catch(() => null) };
    }
  } catch (err) {
    await supabase
      .from('learning_source_pull_attempts')
      .update({ status: 'failed', error: String(err) })
      .eq('id', attempt.id);
    return new Response(JSON.stringify({ error: 'dispatch failed', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const unmapped =
    dispatch.status === 202 &&
    (dispatch.body as Record<string, unknown> | null)?.reason === 'unmapped_identity';
  const finalStatus = unmapped
    ? 'unmapped'
    : dispatch.status >= 200 && dispatch.status < 300 ? 'completed' : 'failed';
  await supabase
    .from('learning_source_pull_attempts')
    .update({ status: finalStatus, response: dispatch.body })
    .eq('id', attempt.id);

  // Failed processing returns non-2xx so the partner retries; the same
  // delivery id will be re-processed (not reported as duplicate).
  return new Response(
    JSON.stringify({
      ok: finalStatus !== 'failed',
      attempt_id: attempt.id,
      source: source.slug,
      event: eventType,
      sig_mode: verify.mode,
      status: finalStatus,
      dispatch_status: dispatch.status,
    }),
    {
      status: finalStatus === 'failed' ? 502 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
