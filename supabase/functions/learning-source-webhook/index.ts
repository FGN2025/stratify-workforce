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

  // Idempotency: a delivery id is a duplicate only if the earlier attempt
  // reached a terminal non-failed state. Failed attempts are re-processed
  // in place so transient failures can recover to exactly one outcome.
  let retryAttemptId: string | null = null;
  if (deliveryId) {
    const { data: existing } = await supabase
      .from('learning_source_pull_attempts')
      .select('id, status, response')
      .eq('source_slug', source.slug)
      .eq('action', `webhook:${eventType}`)
      .eq('external_attempt_id', deliveryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && existing.status !== 'failed' && existing.status !== 'queued') {
      return new Response(
        JSON.stringify({ duplicate: true, attempt_id: existing.id, status: existing.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (existing) retryAttemptId = existing.id;
  }

  let attempt: { id: string };
  if (retryAttemptId) {
    await supabase
      .from('learning_source_pull_attempts')
      .update({ status: 'queued', error: null, request: { sig_mode: verify.mode, payload, retried: true } })
      .eq('id', retryAttemptId);
    attempt = { id: retryAttemptId };
  } else {
    const { data, error: attemptErr } = await supabase
      .from('learning_source_pull_attempts')
      .insert({
        source_slug: source.slug,
        direction: 'inbound',
        action: `webhook:${eventType}`,
        external_attempt_id: deliveryId,
        status: 'queued',
        request: { sig_mode: verify.mode, payload },
      })
      .select('id')
      .single();
    if (attemptErr || !data) {
      return new Response(JSON.stringify({ error: 'failed to record attempt' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    attempt = data;
  }

  const recordOnly = async (reason: string, extra: Record<string, unknown> = {}) => {
    await supabase
      .from('learning_source_pull_attempts')
      .update({ status: 'shadow', response: { reason, event: eventType, ...extra } })
      .eq('id', attempt.id);
    return new Response(
      JSON.stringify({ ok: true, recorded: true, reason, source: source.slug, event: eventType, attempt_id: attempt.id }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  };

  if (source.shadow_mode) return await recordOnly('shadow_mode');
  if (!signatureVerified) return await recordOnly('signature_not_verified', { detail: verify.reason });

  // Decision 4 (2026-09-30): partner evidence approvals are supporting
  // evidence only — recorded, never credential or XP.
  if (eventType === 'evidence.approved' && !EVIDENCE_APPROVED_ENABLED) {
    return await recordOnly('supporting_evidence_only', { credentialed: false, xp: 0 });
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
