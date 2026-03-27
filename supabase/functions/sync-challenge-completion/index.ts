import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TaskProgress {
  task_id: string;
  completed: boolean;
  completed_at?: string;
}

interface CompletionPayload {
  user_email: string;
  challenge_id: string;
  score?: number;
  skills_verified?: string[];
  task_progress?: TaskProgress[];
  metadata?: Record<string, unknown>;
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

    // Verify API key (same pattern as credential-api)
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

    const body: CompletionPayload = await req.json();
    const { user_email, challenge_id, score, skills_verified, task_progress, metadata } = body;

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

    // 3. Get current attempt count for this user + work order
    const { count: attemptCount } = await supabase
      .from('user_work_order_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('work_order_id', workOrder.id);

    const attemptNumber = (attemptCount || 0) + 1;
    const completionStatus = (score !== undefined && score >= 70) ? 'completed' : 'failed';

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
        completed_at: new Date().toISOString(),
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
      // Fetch work_order_tasks mapped to this work order via source_task_id
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

          const { error: upsertError } = await supabase
            .from('user_task_progress')
            .upsert({
              user_id: user.id,
              work_order_task_id: woTaskId,
              work_order_id: workOrder.id,
              is_completed: tp.completed,
              completed_at: tp.completed ? (tp.completed_at || new Date().toISOString()) : null,
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
      // Find or create skill passport
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
          .insert({
            user_id: user.id,
            passport_hash: passportHash,
          })
          .select('id')
          .single();

        passport = newPassport;
      }

      if (passport) {
        // Generate verification hash
        const encoder = new TextEncoder();
        const credentialData = `${passport.id}-${workOrder.title}-${app.app_slug}-${Date.now()}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(credentialData));
        const verificationHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Build task completion summary for credential metadata
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
              ...(taskSummary || {}),
              ...(metadata || {}),
            },
          })
          .select()
          .single();

        credential = issuedCredential;
      }
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
