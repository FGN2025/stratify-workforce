import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  return {
    user_email: userEmail || '',
    challenge_id: challengeId || '',
    score,
    completed_at: raw.completed_at as string | undefined,
    skills_verified: raw.skills_verified as string[] | undefined,
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key
    const apiKey = req.headers.get('x-app-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing X-App-Key header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: appData, error: appError } = await supabase.rpc('verify_app_api_key', {
      p_api_key: apiKey,
    });

    if (appError || !appData || appData.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const app = appData[0];

    // Parse and normalize the payload
    const rawBody = await req.json();
    const body = normalizePayload(rawBody);
    const { user_email, challenge_id, score, completed_at, skills_verified, task_progress, metadata } = body;

    if (!user_email || !challenge_id) {
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

    // 2. Find the work order linked to this challenge
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('source_challenge_id', challenge_id)
      .single();

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

    // 4. Create work order completion record
    const { data: completion, error: completionError } = await supabase
      .from('user_work_order_completions')
      .insert({
        user_id: user.id,
        work_order_id: workOrder.id,
        status: completionStatus,
        score: score ?? null,
        xp_awarded: completionStatus === 'completed' ? workOrder.xp_reward : 0,
        attempt_number: attemptNumber,
        completed_at: completionTimestamp,
        metadata: metadata || {},
      })
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
        const encoder = new TextEncoder();
        const credentialData = `${passport.id}-${workOrder.title}-${app.app_slug}-${Date.now()}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(credentialData));
        const verificationHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const taskSummary = taskResults.length > 0
          ? { tasks_synced: taskResults.filter(t => t.status === 'synced').length, tasks_total: taskResults.length }
          : undefined;

        const { data: issuedCredential } = await supabase
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
            external_reference_id: challenge_id,
            metadata: {
              challenge_id,
              attempt_number: attemptNumber,
              completed_at: completionTimestamp,
              ...(taskSummary || {}),
              ...(metadata || {}),
            },
          })
          .select()
          .single();

        credential = issuedCredential;
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

    // 9. Track completion detection — hardcoded per developer brief v2
    const TRACK3_CHALLENGES = [
      'bcb4a446-d0b7-4432-bedb-4f7ce42ff557',
      '452f8199-9e08-484c-bf8c-887cb24ad3ce',
      '7c7ae072-81a1-4dac-8307-268266a786e6',
      'd098fcac-09a6-41b3-b196-97b98e4435e1',
    ];
    const TRACK4_CHALLENGES = [
      '02481a75-383c-485a-bdff-f0a4dd2b9121',
      '1c899b1a-a527-4023-aeb4-43d387993578',
      '260d4700-7f7a-431f-9768-097284293cd6',
      'e18786a7-043f-4900-8a07-c892c36af1b9',
      'ae4c4228-f107-4f31-ae3d-ec819b0b6863',
      '2a7c0a85-8f05-4c15-965b-e94f72f3672f',
      '858d2e0d-6d78-4d7f-8377-0dc40ab269dd',
    ];

    const TRACK3_LESSON_ID = 'a1b2c3d4-0003-4000-8000-000000000001';
    const TRACK4_LESSON_ID = 'a1b2c3d4-0004-4000-8000-000000000001';

    let trackCompletion: { track: string; lesson_id: string } | null = null;

    const isTrack3 = TRACK3_CHALLENGES.includes(challenge_id);
    const isTrack4 = TRACK4_CHALLENGES.includes(challenge_id);

    if (completionStatus === 'completed' && (isTrack3 || isTrack4)) {
      const trackChallenges = isTrack3 ? TRACK3_CHALLENGES : TRACK4_CHALLENGES;
      const trackName = isTrack3 ? 'OSHA Safety Overlay' : 'Fiber Optics Construction';
      const lessonId = isTrack3 ? TRACK3_LESSON_ID : TRACK4_LESSON_ID;

      // Find all work orders linked to this track's challenges
      const { data: trackWOs } = await supabase
        .from('work_orders')
        .select('id, source_challenge_id')
        .in('source_challenge_id', trackChallenges);

      if (trackWOs && trackWOs.length === trackChallenges.length) {
        const trackWOIds = trackWOs.map(wo => wo.id);

        // Count how many this user has completed (status = 'completed')
        const { count: completedCount } = await supabase
          .from('user_work_order_completions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .in('work_order_id', trackWOIds);

        if (completedCount && completedCount >= trackChallenges.length) {
          trackCompletion = { track: trackName, lesson_id: lessonId };

          const notifMessage = isTrack3
            ? 'You have completed the OSHA Safety Overlay track. Continue your skills development at fgn.academy to earn your credential.'
            : 'You have completed the Fiber Optics Construction track. Continue to fgn.academy to begin your TIRAP UUIT credential pathway.';

          notifications.push({
            user_id: user.id,
            type: 'knowledge_check_available',
            title: `Track Complete: ${trackName}`,
            message: notifMessage,
            icon_name: 'graduation-cap',
            accent_color: '#6366f1',
            link_url: '/learn',
            metadata: { track: trackName, lesson_id: lessonId },
          });
        }
      }
    }

    // Batch insert all notifications
    if (notifications.length > 0) {
      await supabase.from('user_notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({
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
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
