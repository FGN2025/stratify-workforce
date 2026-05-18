// Generic learning-source handlers (Phase G0).
//
// Source-agnostic implementations of the three canonical events:
//   - achievement.earned
//   - evidence.approved
//   - challenge.completed (delegated to sync-challenge-completion for Play parity)
//
// All Play-specific logic in `play-webhook-receiver` is intentionally left in
// place; new sources route through here. Behavior is parameterized by a
// `SourceConfig` so adding a partner is a registry INSERT, not code.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type SupabaseSvc = ReturnType<typeof createClient>;

export type SourceConfig = {
  slug: string;
  display_name: string;
  hmac_secret_env_name: string | null;
  strict_mode: boolean;
  skill_tag_pattern: string;
  ingestion_mode: 'push' | 'pull';
  is_active: boolean;
};

// -- Skill-tag sanitization ----------------------------------------------------

export function sanitizeSkillTags(
  pattern: string,
  tags: unknown,
): { kept: string[]; dropped: string[] } {
  if (!Array.isArray(tags)) return { kept: [], dropped: [] };
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch {
    re = /^(fiber|osha|cdl|gaming|difficulty):[a-z0-9-]+$/;
  }
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') {
      dropped.push(String(raw));
      continue;
    }
    const v = raw.trim().toLowerCase();
    if (re.test(v)) kept.push(v);
    else dropped.push(raw);
  }
  return { kept, dropped };
}

// -- HMAC verification ---------------------------------------------------------

export type VerifyResult = {
  ok: boolean;
  mode: 'unsigned' | 'strict' | 'lenient';
  reason?: string;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function verifySignature(
  source: SourceConfig,
  rawBody: string,
  sigHeader: string | null,
): Promise<VerifyResult> {
  const envName = source.hmac_secret_env_name;
  if (!envName) {
    return { ok: true, mode: 'unsigned', reason: 'no hmac_secret_env_name configured' };
  }
  const secret = Deno.env.get(envName);
  if (!secret) {
    console.warn('[learning-source] secret not configured', { envName, slug: source.slug });
    return { ok: true, mode: 'unsigned', reason: `${envName} not configured` };
  }

  const provided = sigHeader ?? '';
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
    if (ok) return { ok: true, mode: source.strict_mode ? 'strict' : 'lenient' };
    const reason = `signature mismatch — provided=${provided.slice(0, 8)}… expected=${expected.slice(0, 8)}…`;
    if (source.strict_mode) return { ok: false, mode: 'strict', reason };
    return { ok: true, mode: 'lenient', reason: `${reason} (lenient)` };
  } catch (err) {
    if (source.strict_mode) return { ok: false, mode: 'strict', reason: `verify failed: ${err}` };
    return { ok: true, mode: 'lenient', reason: `verify failed: ${err}` };
  }
}

// -- Source resolution ---------------------------------------------------------

export async function resolveSource(
  supabase: SupabaseSvc,
  slug: string,
): Promise<SourceConfig | null> {
  const { data, error } = await supabase
    .from('learning_sources')
    .select('slug, display_name, hmac_secret_env_name, strict_mode, skill_tag_pattern, ingestion_mode, is_active')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data || !data.is_active) return null;
  return data as SourceConfig;
}

// -- Identity resolution -------------------------------------------------------

export type IdentityResolution =
  | { ok: true; userId: string; matchedBy: 'source_identity' | 'email' }
  | { ok: false; reason: string };

export async function resolveIdentity(
  supabase: SupabaseSvc,
  sourceSlug: string,
  externalUserId: string | null,
  email: string | null,
): Promise<IdentityResolution> {
  if (externalUserId) {
    const { data } = await supabase
      .from('learning_source_identity')
      .select('user_id')
      .eq('source_slug', sourceSlug)
      .eq('external_user_id', externalUserId)
      .maybeSingle();
    if (data?.user_id) {
      await supabase
        .from('learning_source_identity')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('source_slug', sourceSlug)
        .eq('external_user_id', externalUserId);
      return { ok: true, userId: data.user_id as string, matchedBy: 'source_identity' };
    }
  }
  if (email) {
    const { data: userId, error } = await supabase.rpc('get_user_id_by_email', { p_email: email });
    if (!error && userId) {
      if (externalUserId) {
        await supabase.from('learning_source_identity').upsert(
          {
            source_slug: sourceSlug,
            external_user_id: externalUserId,
            user_id: userId as string,
            email,
            matched_via: 'email',
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'source_slug,external_user_id' },
        );
      }
      return { ok: true, userId: userId as string, matchedBy: 'email' };
    }
  }
  return { ok: false, reason: 'unmapped_identity' };
}

// -- Passport ensure -----------------------------------------------------------

export async function ensurePassport(supabase: SupabaseSvc, userId: string): Promise<string | null> {
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
    console.error('[learning-source] passport insert failed', error);
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

// -- achievement.earned --------------------------------------------------------

export async function handleAchievementEarned(
  supabase: SupabaseSvc,
  source: SourceConfig,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const user = (data.user as Record<string, unknown>) ?? {};
  const externalUserId =
    (user.external_user_id as string | null) ??
    (data.external_user_id as string | null) ??
    null;
  const email = (user.email as string | null) ?? (data.user_email as string | null) ?? null;
  const externalRef =
    (data.achievement_id as string | null) ?? (data.id as string | null) ?? null;

  if (!externalRef) return { status: 400, body: { error: 'missing achievement_id' } };

  const ident = await resolveIdentity(supabase, source.slug, externalUserId, email);
  if (!ident.ok) {
    return {
      status: 202,
      body: { credentialed: false, reason: ident.reason, external_user_id: externalUserId, email },
    };
  }

  const passportId = await ensurePassport(supabase, ident.userId);
  if (!passportId) return { status: 500, body: { error: 'passport upsert failed' } };

  const verificationHash = await sha256Hex(`${source.slug}|${externalRef}|${passportId}`);
  const tenant = (data.tenant as Record<string, unknown>) ?? {};
  const tagged = sanitizeSkillTags(source.skill_tag_pattern, data.skills_verified);

  const credentialRow = {
    passport_id: passportId,
    credential_type: 'badge',
    credential_type_key: `${source.slug}_achievement`,
    title: (data.name as string | null) ?? (data.title as string | null) ?? `${source.display_name} Achievement`,
    issuer: source.display_name,
    issuer_app_slug: source.slug,
    source: 'external_api',
    external_reference_id: externalRef,
    skills_verified: tagged.kept,
    xp_earned: typeof data.xp_reward === 'number' ? (data.xp_reward as number) : 0,
    issued_at: (data.earned_at as string | null) ?? (data.completed_at as string | null) ?? new Date().toISOString(),
    verification_hash: verificationHash,
    metadata: {
      ...data,
      _resolved: { matched_by: ident.matchedBy, external_user_id: externalUserId, email },
      _tenant: tenant,
      _dropped_tags: tagged.dropped,
      _source: source.slug,
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
        .eq('credential_type_key', `${source.slug}_achievement`)
        .maybeSingle();
      return {
        status: 200,
        body: { credentialed: true, duplicate: true, credential_id: existing?.id ?? null },
      };
    }
    console.error('[learning-source] credential insert failed', error);
    return { status: 500, body: { error: 'credential insert failed', detail: error.message } };
  }

  return { status: 200, body: { credentialed: true, credential_id: inserted.id, was_new: true } };
}

// -- evidence.approved ---------------------------------------------------------

export async function handleEvidenceApproved(
  supabase: SupabaseSvc,
  source: SourceConfig,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const user = (data.user as Record<string, unknown>) ?? {};
  const externalUserId =
    (user.external_user_id as string | null) ??
    (data.external_user_id as string | null) ??
    null;
  const email = (user.email as string | null) ?? (data.user_email as string | null) ?? null;
  const externalRef =
    (data.evidence_id as string | null) ?? (data.id as string | null) ?? null;

  if (!externalRef) return { status: 400, body: { error: 'missing evidence_id' } };

  const ident = await resolveIdentity(supabase, source.slug, externalUserId, email);
  if (!ident.ok) {
    return {
      status: 202,
      body: { credentialed: false, reason: ident.reason, external_user_id: externalUserId, email },
    };
  }

  const passportId = await ensurePassport(supabase, ident.userId);
  if (!passportId) return { status: 500, body: { error: 'passport upsert failed' } };

  const verificationHash = await sha256Hex(`${source.slug}|evidence|${externalRef}|${passportId}`);
  const explicitSkills = Array.isArray(data.skills_verified) ? (data.skills_verified as string[]) : [];
  const singleSkill = (data.skill as string | null) ?? (data.skill_key as string | null);
  const raw = explicitSkills.length > 0 ? explicitSkills : singleSkill ? [singleSkill] : [];
  const tagged = sanitizeSkillTags(source.skill_tag_pattern, raw);

  const title = (data.work_order_title as string | null)
    ?? (data.title as string | null)
    ?? (singleSkill ? `Verified: ${singleSkill}` : `${source.display_name} Evidence Verified`);

  const credentialRow = {
    passport_id: passportId,
    credential_type: 'skill_verification',
    credential_type_key: `${source.slug}_evidence`,
    title,
    issuer: source.display_name,
    issuer_app_slug: source.slug,
    source: 'external_api',
    external_reference_id: externalRef,
    skills_verified: tagged.kept,
    score: typeof data.score === 'number' ? (data.score as number) : null,
    xp_earned: typeof data.xp_reward === 'number' ? (data.xp_reward as number) : 0,
    issued_at: (data.approved_at as string | null) ?? new Date().toISOString(),
    verification_hash: verificationHash,
    metadata: {
      ...data,
      _resolved: { matched_by: ident.matchedBy, external_user_id: externalUserId, email },
      _dropped_tags: tagged.dropped,
      _source: source.slug,
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
        .eq('credential_type_key', `${source.slug}_evidence`)
        .maybeSingle();
      return {
        status: 200,
        body: { credentialed: true, duplicate: true, credential_id: existing?.id ?? null },
      };
    }
    console.error('[learning-source] evidence credential insert failed', error);
    return { status: 500, body: { error: 'credential insert failed', detail: error.message } };
  }

  return { status: 200, body: { credentialed: true, credential_id: inserted.id, was_new: true } };
}

// -- Event normalization -------------------------------------------------------

export const SUPPORTED_EVENTS = new Set([
  'achievement.earned',
  'evidence.approved',
  'challenge.completed',
  'enrollment.completed',
]);

const EVENT_ALIASES: Record<string, string> = {
  challenge_completion: 'challenge.completed',
  'challenge.completion': 'challenge.completed',
  evidence_approved: 'evidence.approved',
  achievement_earned: 'achievement.earned',
  enrollment_completed: 'enrollment.completed',
};

export function normalizeEvent(raw: string): string {
  const v = (raw ?? '').trim();
  return EVENT_ALIASES[v] ?? v;
}
