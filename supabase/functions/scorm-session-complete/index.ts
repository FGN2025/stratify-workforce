/**
 * scorm-session-complete — v0.3 progress sync endpoint for the SCORM Player.
 *
 * Locked contract (PHASE_2_SPEC.md §"v0.3 coordination contract"):
 *   - Body: { course_id, session_id, lesson_status, lesson_location, score_raw,
 *             passing_threshold, session_time_seconds, scorm_suspend_data,
 *             passed, flush? }
 *   - session_time_seconds is delta-since-last-flush, integer, 0..3600.
 *     Outside envelope = hard 400, no clamping. Backfills > 1h are out-of-band.
 *   - Server is stateless on time math: total_time_seconds += session_time_seconds.
 *   - Terminal passed=true → upsert skill_credentials (source='scorm_session',
 *     unique on (passport_id, course_id) WHERE source='scorm_session'), grant
 *     user_points XP only on first-pass insert (attempts=1).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set([
  'not attempted',
  'incomplete',
  'completed',
  'passed',
  'failed',
  'browsed',
]);
const TERMINAL_STATUSES = new Set(['passed', 'failed', 'completed']);
const MAX_DELTA = 3600;
const MAX_SUSPEND_BYTES = 64 * 1024;

interface Payload {
  course_id: string;
  session_id: string;
  lesson_status: string;
  lesson_location: string | null;
  score_raw: number | null;
  passing_threshold: number | null;
  session_time_seconds: number;
  scorm_suspend_data: string;
  passed: boolean;
  flush?: boolean;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validate(body: unknown): { ok: true; data: Payload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.course_id !== 'string' || !UUID_RE.test(b.course_id))
    return { ok: false, error: 'course_id must be uuid' };
  if (typeof b.session_id !== 'string' || !UUID_RE.test(b.session_id))
    return { ok: false, error: 'session_id must be uuid' };
  if (typeof b.lesson_status !== 'string' || !VALID_STATUSES.has(b.lesson_status))
    return { ok: false, error: `lesson_status must be one of ${[...VALID_STATUSES].join(', ')}` };
  if (b.lesson_location !== null && typeof b.lesson_location !== 'string')
    return { ok: false, error: 'lesson_location must be string|null' };
  if (b.score_raw !== null && (typeof b.score_raw !== 'number' || !Number.isFinite(b.score_raw)))
    return { ok: false, error: 'score_raw must be number|null' };
  if (
    b.passing_threshold !== null &&
    (typeof b.passing_threshold !== 'number' || !Number.isFinite(b.passing_threshold))
  )
    return { ok: false, error: 'passing_threshold must be number|null' };
  if (
    typeof b.session_time_seconds !== 'number' ||
    !Number.isInteger(b.session_time_seconds) ||
    b.session_time_seconds < 0 ||
    b.session_time_seconds > MAX_DELTA
  )
    return { ok: false, error: `session_time_seconds must be integer 0..${MAX_DELTA}` };
  if (typeof b.scorm_suspend_data !== 'string')
    return { ok: false, error: 'scorm_suspend_data must be string' };
  if (b.scorm_suspend_data.length > MAX_SUSPEND_BYTES)
    return { ok: false, error: `scorm_suspend_data exceeds ${MAX_SUSPEND_BYTES} bytes` };
  if (typeof b.passed !== 'boolean') return { ok: false, error: 'passed must be boolean' };
  return { ok: true, data: b as unknown as Payload };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  // Auth — validate JWT in code (verify_jwt = false at platform).
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'missing bearer token' });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: 'invalid token' });
  const userId = userData.user.id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'invalid json' });
  }
  const v = validate(raw);
  if (!v.ok) return json(400, { error: v.error });
  const p = v.data;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Verify course exists and is published; pull title + work_order_id for downstream.
  const { data: course, error: courseErr } = await admin
    .from('scorm_courses')
    .select('id, title, work_order_id, is_published')
    .eq('id', p.course_id)
    .maybeSingle();
  if (courseErr) return json(500, { error: 'course lookup failed', detail: courseErr.message });
  if (!course || !course.is_published) return json(404, { error: 'course not found' });

  const isTerminal = TERMINAL_STATUSES.has(p.lesson_status);
  const now = new Date().toISOString();

  // Upsert progress with stateless additive time math.
  // We can't express `total_time_seconds = existing + new` via PostgREST upsert,
  // so SELECT current then UPDATE/INSERT explicitly.
  const { data: existing, error: existingErr } = await admin
    .from('scorm_course_progress')
    .select('id, total_time_seconds, attempts')
    .eq('user_id', userId)
    .eq('course_id', p.course_id)
    .maybeSingle();
  if (existingErr)
    return json(500, { error: 'progress lookup failed', detail: existingErr.message });

  const newTotal = (existing?.total_time_seconds ?? 0) + p.session_time_seconds;
  const newAttempts = (existing?.attempts ?? 0) + (isTerminal ? 1 : 0);

  if (existing) {
    const { error: updErr } = await admin
      .from('scorm_course_progress')
      .update({
        suspend_data: p.scorm_suspend_data,
        lesson_status: p.lesson_status,
        lesson_location: p.lesson_location,
        score_raw: p.score_raw,
        score: p.score_raw,
        total_time_seconds: newTotal,
        attempts: newAttempts,
        last_session_id: p.session_id,
        last_session_at: now,
        updated_at: now,
      })
      .eq('id', existing.id);
    if (updErr) return json(500, { error: 'progress update failed', detail: updErr.message });
  } else {
    const { error: insErr } = await admin.from('scorm_course_progress').insert({
      user_id: userId,
      course_id: p.course_id,
      suspend_data: p.scorm_suspend_data,
      lesson_status: p.lesson_status,
      lesson_location: p.lesson_location,
      score_raw: p.score_raw,
      score: p.score_raw,
      total_time_seconds: newTotal,
      attempts: newAttempts,
      last_session_id: p.session_id,
      last_session_at: now,
    });
    if (insErr) return json(500, { error: 'progress insert failed', detail: insErr.message });
  }

  let credentialIssued = false;
  let pointsGranted = 0;

  if (isTerminal && p.passed) {
    // Resolve passport.
    const { data: passportId, error: ppErr } = await admin.rpc('ensure_skill_passport', {
      p_user_id: userId,
    });
    if (ppErr) return json(500, { error: 'passport resolution failed', detail: ppErr.message });

    // Look up xp from the source work_order (canonical xp source).
    let xpReward = 0;
    if (course.work_order_id) {
      const { data: wo } = await admin
        .from('work_orders')
        .select('xp_reward')
        .eq('id', course.work_order_id)
        .maybeSingle();
      xpReward = wo?.xp_reward ?? 0;
    }

    const externalRef = `scorm:${p.course_id}:${userId}`;
    const verificationHash = await sha256Hex(`${passportId}|${externalRef}|${now}`);

    // Check existing credential to detect first-pass vs re-pass.
    const { data: existingCred } = await admin
      .from('skill_credentials')
      .select('id, attempts, xp_earned')
      .eq('passport_id', passportId)
      .eq('course_id', p.course_id)
      .eq('source', 'scorm_session')
      .maybeSingle();

    if (existingCred) {
      const nextAttempts = (existingCred.attempts ?? 1) + 1;
      const nextXp = Math.max(existingCred.xp_earned ?? 0, xpReward);
      const { error: credUpdErr } = await admin
        .from('skill_credentials')
        .update({
          attempts: nextAttempts,
          xp_earned: nextXp,
          score: p.score_raw,
          issued_at: now,
        })
        .eq('id', existingCred.id);
      if (credUpdErr)
        return json(500, { error: 'credential update failed', detail: credUpdErr.message });
      credentialIssued = true;
    } else {
      const { error: credInsErr } = await admin.from('skill_credentials').insert({
        passport_id: passportId,
        credential_type: 'course_completion',
        title: course.title,
        issuer: 'FGN Academy',
        issued_at: now,
        skills_verified: [],
        verification_hash: verificationHash,
        metadata: { course_id: p.course_id, session_id: p.session_id },
        source: 'scorm_session',
        course_id: p.course_id,
        external_reference_id: externalRef,
        xp_earned: xpReward,
        attempts: 1,
        score: p.score_raw,
      });
      if (credInsErr)
        return json(500, { error: 'credential insert failed', detail: credInsErr.message });
      credentialIssued = true;

      // First-pass XP grant.
      if (xpReward > 0) {
        const eventKey = `scorm:first-pass:${p.course_id}:${userId}`;
        const { error: ptsErr } = await admin.from('user_points').upsert({
          user_id: userId,
          points_type: 'xp',
          amount: xpReward,
          source_type: 'course',
          source_id: p.course_id,
          description: `SCORM course completion: ${course.title}`,
          event_key: eventKey,
        }, { onConflict: 'user_id,event_key', ignoreDuplicates: true });
        if (ptsErr) {
          // Log but don't fail the request — credential is the durable record.
          console.error('user_points insert failed', ptsErr);
        } else {
          pointsGranted = xpReward;
        }
      }
    }
  }

  return json(200, {
    status: 'ok',
    total_time_seconds: newTotal,
    attempts: newAttempts,
    credential_issued: credentialIssued,
    points_granted: pointsGranted,
  });
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
