import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-key, x-ecosystem-key, x-delivery-id, x-play-path, x-play-delivery-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CE_COURSE_ID = 'dab09852-eeb2-431f-b2f4-b881c6b4aa7f';

/**
 * Per-challenge lesson lookup with a 60s TTL cache.
 * Source: public.challenge_lesson_mappings (admin-managed). Returns ALL active
 * lesson_ids mapped to the challenge — each carries its own xp_reward, so a
 * single play.fgn.gg challenge can grant XP across multiple lessons (callers
 * are expected to grant XP per-lesson, not deduplicated).
 */
type SupabaseLike = ReturnType<typeof createClient>;
const LESSON_LOOKUP_CACHE = new Map<string, { ids: string[]; expires: number }>();
const LESSON_LOOKUP_TTL_MS = 60_000;

async function getLessonIdsForChallenge(
  client: SupabaseLike,
  challengeId: string,
): Promise<string[]> {
  const now = Date.now();
  const cached = LESSON_LOOKUP_CACHE.get(challengeId);
  if (cached && cached.expires > now) return cached.ids;

  const { data, error } = await client
    .from('challenge_lesson_mappings')
    .select('lesson_id')
    .eq('play_challenge_id', challengeId)
    .eq('is_active', true);

  if (error) {
    console.error('[lesson-lookup] query failed', challengeId, error);
    return cached?.ids ?? [];
  }

  const ids = (data ?? []).map((r) => r.lesson_id as string);
  LESSON_LOOKUP_CACHE.set(challengeId, { ids, expires: now + LESSON_LOOKUP_TTL_MS });
  return ids;
}

interface TaskProgress {
  task_id: string;
  completed?: boolean;
  status?: string;
  title?: string;
  completed_at?: string | null;
}

interface CompletionPayload {
  user_email: string;
  challenge_id: string;
  score?: number;
  completed_at?: string;
  skills_verified?: string[];
  task_progress?: TaskProgress[];
  metadata?: Record<string, unknown>;
}

/**
 * Normalize a potentially nested payload into the flat format.
 * Handles: player.email → user_email, challenge.id → challenge_id, etc.
 */
function normalizePayload(raw: Record<string, unknown>): CompletionPayload {
  let userEmail = raw.user_email as string | undefined;
  let challengeId = raw.challenge_id as string | undefined;
  const metadata = (raw.metadata as Record<string, unknown>) || {};

  // Flatten nested player object
  if (!userEmail && raw.player && typeof raw.player === 'object') {
    const player = raw.player as Record<string, unknown>;
    userEmail = player.email as string | undefined;
    if (player.display_name) metadata.display_name = player.display_name;
    if (player.external_id) metadata.external_user_id = player.external_id;
  }

  // Flatten nested challenge object
  if (!challengeId && raw.challenge && typeof raw.challenge === 'object') {
    const challenge = raw.challenge as Record<string, unknown>;
    challengeId = challenge.id as string | undefined;
  }

  // Score fallback: compute from metadata if missing
  let score = raw.score as number | undefined;
  if (score === undefined || score === null) {
    const awarded = (metadata.awarded_points ?? raw.awarded_points) as number | undefined;
    const max = (metadata.max_points ?? raw.max_points) as number | undefined;
    if (awarded !== undefined && max !== undefined) {
      if (max === 0) {
        score = awarded > 0 ? 100 : 0;
      } else {
        score = Math.round((awarded / max) * 100);
      }
    }
  }

  // Skill-tag sanitization: only accept v1 namespaced tags
  // (fiber|osha|cdl|gaming|difficulty):<slug>. Drops everything else so the
  // direct-POST leg can't bypass the receiver's taxonomy guard.
  const VALID = /^(fiber|osha|cdl|gaming|difficulty):[a-z0-9-]+$/;
  const rawTags = Array.isArray(raw.skills_verified) ? (raw.skills_verified as unknown[]) : [];
  const cleanTags: string[] = [];
  const droppedTags: string[] = [];
  for (const t of rawTags) {
    if (typeof t !== 'string') { droppedTags.push(String(t)); continue; }
    const v = t.trim().toLowerCase();
    if (VALID.test(v)) cleanTags.push(v); else droppedTags.push(t);
  }
  if (droppedTags.length > 0) {
    metadata._dropped_tags = [...((metadata._dropped_tags as string[]) ?? []), ...droppedTags];
  }

  return {
    user_email: userEmail || '',
    challenge_id: challengeId || '',
    score,
    completed_at: raw.completed_at as string | undefined,
    skills_verified: cleanTags,
    task_progress: raw.task_progress as TaskProgress[] | undefined,
    metadata,
  };
}

/** Resolve task completion from either `completed` boolean or `status` string */
function isTaskCompleted(tp: TaskProgress): boolean {
  if (typeof tp.completed === 'boolean') return tp.completed;
  if (typeof tp.status === 'string') return tp.status.toLowerCase() === 'completed';
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parity instrumentation: capture path + delivery id BEFORE entering main try,
  // so play_sync_attempts mirrors the direct-POST leg distinctly from the
  // play-webhook-receiver dispatch leg. This makes §3a parity SQL surface both
  // legs of the shadow-window double-fire even when they share an external_attempt_id.
  const playPathHeader = (req.headers.get('x-play-path') || '').toLowerCase();
  const deliveryIdHeader =
    req.headers.get('x-delivery-id') || req.headers.get('x-play-delivery-id') || null;
  const mirrorAction =
    playPathHeader === 'webhook' ? 'direct:challenge.completed:via-webhook-tag'
                                 : 'direct:challenge.completed';
  let mirrorDeliveryId: string | null = deliveryIdHeader;
  let mirrorRequestSnapshot: Record<string, unknown> = {
    headers: { x_play_path: playPathHeader || null, x_delivery_id: deliveryIdHeader },
  };

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const mirrorClient = createClient(supabaseUrl, supabaseServiceKey);

  const writeMirror = async (
    status: 'completed' | 'failed',
    responseSnapshot: Record<string, unknown> | null,
    errorMsg: string | null,
  ) => {
    try {
      await mirrorClient.from('play_sync_attempts').insert({
        direction: 'inbound',
        action: mirrorAction,
        external_attempt_id: mirrorDeliveryId,
        status,
        request: mirrorRequestSnapshot,
        response: responseSnapshot,
        error: errorMsg,
      });
    } catch (e) {
      console.error('[sync-challenge-completion] mirror insert failed', e);
    }
  };

  try {
    const supabase = mirrorClient;

    // Verify API key — dual-header rollout: accept X-App-Key OR X-Ecosystem-Key.
    // X-Ecosystem-Key is the new ecosystem-wide credential being rolled out across
    // play.fgn.gg ↔ fgn.academy. X-App-Key remains supported during the 14-day window.
    const appKey = req.headers.get('x-app-key');
    const ecosystemKey = req.headers.get('x-ecosystem-key');
    const ecosystemKeyExpected = Deno.env.get('ECOSYSTEM_API_KEY');

    let app: { app_slug: string; can_read: boolean; can_issue: boolean; types_allowed: string[] } | null = null;
    let authHeaderUsed: 'x-ecosystem-key' | 'x-app-key' | null = null;

    if (ecosystemKey && ecosystemKeyExpected && ecosystemKey === ecosystemKeyExpected) {
      authHeaderUsed = 'x-ecosystem-key';
      app = {
        app_slug: 'fgn-play',
        can_read: true,
        can_issue: true,
        types_allowed: ['skill_verification', 'course_completion'],
      };
    } else if (appKey) {
      const { data: appData, error: appError } = await supabase.rpc('verify_app_api_key', {
        p_api_key: appKey,
      });
      if (!appError && appData && appData.length > 0) {
        authHeaderUsed = 'x-app-key';
        app = appData[0];
      }
    }

    if (!app) {
      console.warn('[sync-challenge-completion] auth failed', {
        had_x_app_key: !!appKey,
        had_x_ecosystem_key: !!ecosystemKey,
        ecosystem_key_configured: !!ecosystemKeyExpected,
      });
      await writeMirror('failed', { http_status: 401 }, 'auth_failed');
      return new Response(
        JSON.stringify({
          error: 'Authentication failed: provide a valid X-App-Key or X-Ecosystem-Key header',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[sync-challenge-completion] authenticated', {
      app_slug: app.app_slug,
      auth_header: authHeaderUsed,
    });

    // Parse and normalize the payload
    const rawBody = await req.json();
    const body = normalizePayload(rawBody);
    const { user_email, challenge_id, score, completed_at, skills_verified, task_progress, metadata } = body;

    // Resolve delivery_id from payload if header missing — matches play-webhook-receiver
    // 4-source extraction order: header → top-level → metadata → payload.payload.metadata.
    if (!mirrorDeliveryId) {
      const md = (metadata || {}) as Record<string, unknown>;
      mirrorDeliveryId =
        (rawBody as any)?.delivery_id ||
        (md.delivery_id as string | undefined) ||
        (rawBody as any)?.payload?.delivery_id ||
        (rawBody as any)?.payload?.metadata?.delivery_id ||
        null;
    }
    mirrorRequestSnapshot = {
      ...mirrorRequestSnapshot,
      auth_header: authHeaderUsed,
      app_slug: app.app_slug,
      user_email,
      challenge_id,
      score,
      completed_at,
      delivery_id: mirrorDeliveryId,
    };

    if (!user_email || !challenge_id) {
      await writeMirror('failed', { http_status: 400 }, 'missing user_email or challenge_id');
      return new Response(JSON.stringify({ error: 'user_email and challenge_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Find the user by email
    const { data: userId, error: userError } = await supabase
      .rpc('get_user_id_by_email', { p_email: user_email });

    if (userError) throw userError;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User not found. User must be registered on fgn.academy.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = { id: userId };

    // 2. Find the work order linked to this challenge.
    // Prioritize fgn_origin_challenge_id (Play's canonical id), fall back to source_challenge_id.
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .or(`fgn_origin_challenge_id.eq.${challenge_id},source_challenge_id.eq.${challenge_id}`)
      .order('fgn_origin_challenge_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (woError || !workOrder) {
      return new Response(
        JSON.stringify({ error: `No work order found for challenge_id: ${challenge_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get current attempt count
    const { count: attemptCount } = await supabase
      .from('user_work_order_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('work_order_id', workOrder.id);

    const attemptNumber = (attemptCount || 0) + 1;
    const completionStatus = (score !== undefined && score >= 70) ? 'completed' : 'failed';

    // Use completed_at from payload if provided, otherwise server time
    const completionTimestamp = completed_at || new Date().toISOString();

    // 4. Upsert work order completion record (uq_user_work_order constraint:
    // one row per (user_id, work_order_id); attempts are tracked via the counter
    // and metadata, not as separate rows).
    const { data: completion, error: completionError } = await supabase
      .from('user_work_order_completions')
      .upsert({
        user_id: user.id,
        work_order_id: workOrder.id,
        status: completionStatus,
        score: score ?? null,
        xp_awarded: completionStatus === 'completed' ? workOrder.xp_reward : 0,
        attempt_number: attemptNumber,
        completed_at: completionTimestamp,
        metadata: metadata || {},
      }, { onConflict: 'user_id,work_order_id' })
      .select()
      .single();

    if (completionError) throw completionError;

    // 5. Award XP if completed
    if (completionStatus === 'completed' && workOrder.xp_reward > 0) {
      await supabase.from('user_points').insert({
        user_id: user.id,
        points_type: 'xp',
        amount: workOrder.xp_reward,
        source_type: 'work_order',
        source_id: workOrder.id,
        description: `Completed challenge: ${workOrder.title}`,
      });
    }

    // 6. Process task-level progress if provided
    let taskResults: Array<{ task_id: string; status: string }> = [];
    if (task_progress && task_progress.length > 0) {
      const sourceTaskIds = task_progress.map(tp => tp.task_id);
      const { data: woTasks } = await supabase
        .from('work_order_tasks')
        .select('id, source_task_id')
        .eq('work_order_id', workOrder.id)
        .in('source_task_id', sourceTaskIds);

      if (woTasks && woTasks.length > 0) {
        const taskMap = new Map(woTasks.map(t => [t.source_task_id, t.id]));

        for (const tp of task_progress) {
          const woTaskId = taskMap.get(tp.task_id);
          if (!woTaskId) {
            taskResults.push({ task_id: tp.task_id, status: 'not_found' });
            continue;
          }

          const completed = isTaskCompleted(tp);
          const taskMeta: Record<string, unknown> = {};
          if (tp.title) taskMeta.title = tp.title;
          if (tp.status) taskMeta.original_status = tp.status;

          const { error: upsertError } = await supabase
            .from('user_task_progress')
            .upsert({
              user_id: user.id,
              work_order_task_id: woTaskId,
              work_order_id: workOrder.id,
              is_completed: completed,
              completed_at: completed ? (tp.completed_at || completionTimestamp) : null,
              metadata: taskMeta,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,work_order_task_id' });

          taskResults.push({
            task_id: tp.task_id,
            status: upsertError ? 'error' : 'synced',
          });
        }
      }
    }

    // 7. Issue credential to Skill Passport if app has permission
    let credential = null;
    if (app.can_issue && completionStatus === 'completed') {
      let { data: passport } = await supabase
        .from('skill_passport')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!passport) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          encoder.encode(`${user.id}-${Date.now()}`)
        );
        const passportHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const { data: newPassport } = await supabase
          .from('skill_passport')
          .insert({ user_id: user.id, passport_hash: passportHash })
          .select('id')
          .single();

        passport = newPassport;
      }

      if (passport) {
        // Dedup: one credential per (passport, completion). Retries (e.g.
        // "Retry Academy Sync" button on Play, or webhook+direct dual-leg
        // dispatch) collapse to the same completion.id via the
        // user_work_order_completions upsert above; we mirror that
        // idempotency here so we don't mint duplicate skill_credentials.
        // Dedup keys: new canonical `completion:<uuid>` AND legacy raw
        // challenge_id (pre-dedup-patch credentials used the source
        // challenge UUID directly). Match either to avoid double-mint on
        // retries against historically-synced challenges.
        const completionRefId = `completion:${completion.id}`;
        const { data: existingCredentials } = await supabase
          .from('skill_credentials')
          .select('id, title, external_reference_id, metadata, created_at')
          .eq('passport_id', passport.id)
          .or(`external_reference_id.eq.${completionRefId},external_reference_id.eq.${challenge_id}`)
          .order('created_at', { ascending: true });

        // Prefer a row that is already (or can be) bound to this completion.id
        const existingCredential = (existingCredentials || []).find((c: any) => {
          if (c.external_reference_id === completionRefId) return true;
          const meta = (c.metadata || {}) as Record<string, unknown>;
          return !meta.completion_id || meta.completion_id === completion.id;
        }) || (existingCredentials || [])[0];

        if (existingCredential) {
          console.log('[sync-challenge-completion] credential already issued for completion', {
            completion_id: completion.id,
            credential_id: existingCredential.id,
          });
          credential = existingCredential;
        } else {
          const encoder = new TextEncoder();
          const credentialData = `${passport.id}-${workOrder.title}-${app.app_slug}-${completion.id}`;
          const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(credentialData));
          const verificationHash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          const taskSummary = taskResults.length > 0
            ? { tasks_synced: taskResults.filter(t => t.status === 'synced').length, tasks_total: taskResults.length }
            : undefined;

          const { data: issuedCredential, error: credentialError } = await supabase
            .from('skill_credentials')
            .insert({
              passport_id: passport.id,
              title: `Challenge Completed: ${workOrder.title}`,
              credential_type: 'skill_verification',
              game_title: workOrder.game_title,
              score: score ?? null,
              issuer: app.app_slug,
              issuer_app_slug: app.app_slug,
              skills_verified: skills_verified || [],
              verification_hash: verificationHash,
              external_reference_id: completionRefId,
              metadata: {
                challenge_id,
                completion_id: completion.id,
                attempt_number: attemptNumber,
                completed_at: completionTimestamp,
                ...(taskSummary || {}),
                ...(metadata || {}),
              },
            })
            .select()
            .single();

          if (credentialError) {
            console.error('[sync-challenge-completion] credential insert failed', credentialError);
          }
          credential = issuedCredential;
        }
      }
    }

    // 8. Insert user notifications
    const notifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      icon_name: string;
      accent_color: string;
      link_url: string;
      metadata: Record<string, unknown>;
    }> = [];

    // Challenge completion notification
    notifications.push({
      user_id: user.id,
      type: completionStatus === 'completed' ? 'challenge_completed' : 'system',
      title: completionStatus === 'completed'
        ? `Challenge Completed: ${workOrder.title}`
        : `Challenge Attempted: ${workOrder.title}`,
      message: completionStatus === 'completed'
        ? `You scored ${score ?? 0}% and earned ${workOrder.xp_reward} XP!`
        : `You scored ${score ?? 0}%. Keep practicing — 70% required to pass.`,
      icon_name: completionStatus === 'completed' ? 'trophy' : 'target',
      accent_color: completionStatus === 'completed' ? '#10b981' : '#f59e0b',
      link_url: `/work-orders/${workOrder.id}`,
      metadata: { challenge_id, score, attempt_number: attemptNumber },
    });

    // XP earned notification (separate from completion)
    if (completionStatus === 'completed' && workOrder.xp_reward > 0) {
      notifications.push({
        user_id: user.id,
        type: 'xp_earned',
        title: `+${workOrder.xp_reward} XP Earned`,
        message: `Awarded for completing ${workOrder.title}`,
        icon_name: 'zap',
        accent_color: '#8b5cf6',
        link_url: '/profile',
        metadata: { xp: workOrder.xp_reward, source: 'challenge_completion' },
      });
    }

    // Credential issued notification
    if (credential) {
      notifications.push({
        user_id: user.id,
        type: 'credential_issued',
        title: 'New Credential Issued',
        message: `"${credential.title}" has been added to your Skill Passport.`,
        icon_name: 'award',
        accent_color: '#3b82f6',
        link_url: '/profile',
        metadata: { credential_id: credential.id },
      });
    }

    // 9. Track completion detection — driven by challenge_tracks + challenge_track_membership
    let trackCompletion: { track: string; lesson_id: string; challenge_id?: string } | null = null;

    if (completionStatus === 'completed') {
      const { data: memberships } = await supabase
        .from('challenge_track_membership')
        .select('track:challenge_tracks!inner(id, track_key, name, gate_mode, course_id, lesson_id, accent_color, icon_name, is_active)')
        .eq('challenge_id', challenge_id);

      const tracks = (memberships ?? [])
        .map((m: any) => m.track)
        .filter((t: any) => t && t.is_active);

      for (const track of tracks) {
        const courseId = track.course_id ?? CE_COURSE_ID;
        const accent = track.accent_color ?? '#6366f1';
        const icon = track.icon_name ?? 'graduation-cap';

        if (track.gate_mode === 'all_completed') {
          // Need ALL challenges in this track completed before firing
          const { data: members } = await supabase
            .from('challenge_track_membership')
            .select('challenge_id')
            .eq('track_id', track.id);
          const memberChallengeIds = (members ?? []).map((m: any) => m.challenge_id);
          if (memberChallengeIds.length === 0) continue;

          const { data: trackWOs } = await supabase
            .from('work_orders')
            .select('id, source_challenge_id')
            .in('source_challenge_id', memberChallengeIds);

          if (!trackWOs || trackWOs.length !== memberChallengeIds.length) continue;
          const trackWOIds = trackWOs.map(wo => wo.id);
          const { count: completedCount } = await supabase
            .from('user_work_order_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .in('work_order_id', trackWOIds);

          if (!completedCount || completedCount < memberChallengeIds.length) continue;

          const lessonId = track.lesson_id ?? '';
          trackCompletion = { track: track.name, lesson_id: lessonId };
          notifications.push({
            user_id: user.id,
            type: 'knowledge_check_available',
            title: `Track Complete: ${track.name}`,
            message: `You have completed the ${track.name} track. Continue your skills development at fgn.academy to earn your credential.`,
            icon_name: icon,
            accent_color: accent,
            link_url: lessonId ? `/learn/${courseId}/lesson/${lessonId}` : '/learn',
            metadata: { track: track.name, lesson_id: lessonId, course_id: courseId },
          });
        } else {
          // per_challenge — fire on every completion
          const lessonIds = await getLessonIdsForChallenge(supabase, challenge_id);
          const primaryLessonId = lessonIds[0] ?? null;
          const deepLink = primaryLessonId
            ? `/learn/${courseId}/lesson/${primaryLessonId}`
            : `/learn/${courseId}`;

          trackCompletion = {
            track: track.name,
            lesson_id: primaryLessonId || challenge_id,
            challenge_id,
          };

          notifications.push({
            user_id: user.id,
            type: 'knowledge_check_available',
            title: `Knowledge Check Available: ${workOrder.title}`,
            message: `You completed "${workOrder.title}" on play.fgn.gg — a knowledge check module is now available on fgn.academy to reinforce what you learned.`,
            icon_name: icon,
            accent_color: accent,
            link_url: deepLink,
            metadata: {
              track: track.name,
              challenge_id,
              work_order_id: workOrder.id,
              work_order_title: workOrder.title,
              lesson_id: primaryLessonId,
              lesson_ids: lessonIds,
              course_id: courseId,
              deep_link: deepLink,
            },
          });
        }
      }
    }

    // Batch insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase.from('user_notifications').insert(notifications);
      if (notifError) {
        console.error('[sync-challenge-completion] notifications insert failed', notifError, {
          types: notifications.map(n => n.type),
        });
      }
    }

    const responseBody = {
      success: true,
      completion: {
        id: completion.id,
        status: completionStatus,
        score,
        xp_awarded: completionStatus === 'completed' ? workOrder.xp_reward : 0,
        attempt_number: attemptNumber,
      },
      task_progress: taskResults.length > 0 ? taskResults : undefined,
      credential: credential ? { id: credential.id, title: credential.title } : null,
      track_completion: trackCompletion || undefined,
    };

    await writeMirror('completed', { http_status: 200, ...responseBody }, null);

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    await writeMirror('failed', { http_status: 500 }, String(error));
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
