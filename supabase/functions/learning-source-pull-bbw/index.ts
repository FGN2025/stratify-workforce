// BBW pull adapter (Phase G1).
//
// Polls Broadband Workforce (FiberTech Academy) for completed enrollments,
// synthesizes a canonical `achievement.earned` payload, and feeds it through
// the same shared handlers used by push-mode sources.
//
// Cursor: learning_source_pull_cursor.last_completed_at. Advances only after
// a successful batch. Idempotency on `achievement_id = bbw:enrollment:<id>`.
//
// Triggered every 5 minutes via pg_cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  handleAchievementEarned,
  resolveSource,
} from '../_shared/learning-source/handlers.ts';

const SOURCE_SLUG = 'bbw';
const BATCH_LIMIT = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const academyUrl = Deno.env.get('SUPABASE_URL')!;
  const academyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const academy = createClient(academyUrl, academyKey);

  const bbwUrl = Deno.env.get('BBW_SUPABASE_URL');
  const bbwKey = Deno.env.get('BBW_SUPABASE_SERVICE_ROLE_KEY');
  if (!bbwUrl || !bbwKey) {
    return new Response(
      JSON.stringify({ error: 'BBW credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const bbw = createClient(bbwUrl, bbwKey);

  const source = await resolveSource(academy, SOURCE_SLUG);
  if (!source) {
    return new Response(
      JSON.stringify({ error: 'bbw source not active in registry' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Cursor
  const { data: cursorRow } = await academy
    .from('learning_source_pull_cursor')
    .select('last_completed_at')
    .eq('source_slug', SOURCE_SLUG)
    .maybeSingle();
  const since = cursorRow?.last_completed_at ?? '1970-01-01T00:00:00Z';

  // Pull from BBW
  const { data: enrollments, error: enrollErr } = await bbw
    .from('enrollments')
    .select('id, user_id, course_id, completed_at, status')
    .eq('status', 'completed')
    .gt('completed_at', since)
    .order('completed_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (enrollErr) {
    console.error('[bbw-pull] enrollments query failed', enrollErr);
    return new Response(
      JSON.stringify({ error: 'bbw query failed', detail: enrollErr.message }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, processed: 0, since }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Resolve course titles
  const courseIds = Array.from(new Set(enrollments.map((e) => e.course_id).filter(Boolean)));
  const { data: bbwCourses } = await bbw
    .from('courses')
    .select('id, title, difficulty_level')
    .in('id', courseIds);
  const courseMap = new Map((bbwCourses ?? []).map((c) => [c.id as string, c]));

  // Resolve emails via BBW profiles (BBW user_id == auth.uid in BBW)
  const userIds = Array.from(new Set(enrollments.map((e) => e.user_id).filter(Boolean)));
  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    try {
      const { data: userResp } = await (bbw as unknown as { auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string } | null } }> } } })
        .auth.admin.getUserById(uid as string);
      const email = userResp?.user?.email;
      if (email) emailMap.set(uid as string, email);
    } catch (err) {
      console.warn('[bbw-pull] getUserById failed', uid, err);
    }
  }

  // Pre-load content mappings for these BBW courses
  const { data: mappings } = await academy
    .from('external_content_mappings')
    .select('external_id, work_order_id, lesson_id')
    .eq('source_slug', SOURCE_SLUG)
    .in('external_id', courseIds.map((c) => String(c)));
  const mapMap = new Map((mappings ?? []).map((m) => [m.external_id as string, m]));

  let processed = 0;
  let lastCompletedAt = since;
  const results: Array<Record<string, unknown>> = [];

  for (const e of enrollments) {
    const course = courseMap.get(e.course_id as string);
    const email = emailMap.get(e.user_id as string) ?? null;
    const mapping = mapMap.get(e.course_id as string);

    const achievementId = `bbw:enrollment:${e.id}`;
    const payload: Record<string, unknown> = {
      data: {
        achievement_id: achievementId,
        name: course?.title ?? 'Broadband Workforce Course',
        title: course?.title ?? 'Broadband Workforce Course',
        external_user_id: e.user_id,
        user_email: email,
        completed_at: e.completed_at,
        earned_at: e.completed_at,
        skills_verified: [],
        xp_reward: 0,
        evidence_url: `https://broadbandworkforce.com/verify?id=${e.id}`,
        course_id: e.course_id,
        difficulty_level: course?.difficulty_level,
        work_order_id: mapping?.work_order_id ?? null,
        lesson_id: mapping?.lesson_id ?? null,
        unmapped: !mapping,
      },
    };

    // Idempotency check via attempts log
    const { data: existing } = await academy
      .from('learning_source_pull_attempts')
      .select('id, status')
      .eq('source_slug', SOURCE_SLUG)
      .eq('action', 'pull:achievement.earned')
      .eq('external_attempt_id', achievementId)
      .maybeSingle();

    if (existing && existing.status === 'completed') {
      lastCompletedAt = e.completed_at as string;
      continue;
    }

    const { data: attempt } = await academy
      .from('learning_source_pull_attempts')
      .insert({
        source_slug: SOURCE_SLUG,
        direction: 'inbound',
        action: 'pull:achievement.earned',
        external_attempt_id: achievementId,
        status: 'queued',
        request: payload,
      })
      .select('id')
      .single();

    const dispatch = await handleAchievementEarned(academy, source, payload);
    const finalStatus =
      dispatch.status >= 200 && dispatch.status < 300 ? 'completed' : 'failed';

    if (attempt?.id) {
      await academy
        .from('learning_source_pull_attempts')
        .update({ status: finalStatus, response: dispatch.body })
        .eq('id', attempt.id);
    }

    results.push({ id: e.id, status: finalStatus, dispatch_status: dispatch.status });
    if (finalStatus === 'completed') {
      processed += 1;
      lastCompletedAt = e.completed_at as string;
    } else {
      // Stop advancing cursor on failure so we retry next run.
      break;
    }
  }

  // Advance cursor
  if (lastCompletedAt && lastCompletedAt !== since) {
    await academy
      .from('learning_source_pull_cursor')
      .upsert(
        { source_slug: SOURCE_SLUG, last_completed_at: lastCompletedAt, updated_at: new Date().toISOString() },
        { onConflict: 'source_slug' },
      );
  }

  return new Response(
    JSON.stringify({ ok: true, processed, total: enrollments.length, since, advanced_to: lastCompletedAt, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
