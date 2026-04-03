import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
}

interface BreakroomPayload {
  breakroom_username: string
  event_type: 'course_complete' | 'quiz_complete' | 'module_complete'
  course_id_external: string   // Breakroom course name/id as string
  quiz_id_external?: string
  score?: number               // 0-100
  passed?: boolean
  xp_reward?: number
  completion_time_minutes?: number
  metadata?: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate shared secret
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== Deno.env.get('BREAKROOM_SYNC_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let payload: BreakroomPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { breakroom_username, event_type, course_id_external, 
          score, passed, xp_reward, completion_time_minutes, metadata } = payload

  if (!breakroom_username || !event_type || !course_id_external) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // FGN Academy client (this project)
  const fgnClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // BroadbandWorkforce client (separate instance)
  const bbwClient = createClient(
    Deno.env.get('BBW_SUPABASE_URL')!,
    Deno.env.get('BBW_SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Step 1: Resolve Breakroom username to FGN user
  const { data: identity, error: identityError } = await fgnClient
    .from('breakroom_identity')
    .select('user_id, tenant_id')
    .eq('breakroom_username', breakroom_username)
    .single()

  if (identityError || !identity) {
    return new Response(JSON.stringify({ 
      error: 'Unknown Breakroom user', 
      breakroom_username 
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { user_id, tenant_id } = identity
  const xp = xp_reward ?? 100
  const results: Record<string, unknown> = {}

  // Step 2: Write to fgn.academy
  try {
    // Find matching work order by external source reference
    const { data: workOrder } = await fgnClient
      .from('work_orders')
      .select('id, xp_reward')
      .eq('source_challenge_id', course_id_external)
      .maybeSingle()

    if (workOrder) {
      // Write work order completion
      const { error: completionError } = await fgnClient
        .from('user_work_order_completions')
        .upsert({
          user_id,
          work_order_id: workOrder.id,
          status: passed !== false ? 'completed' : 'failed',
          score: score ?? null,
          xp_awarded: workOrder.xp_reward ?? xp,
          attempt_number: 1,
          completed_at: new Date().toISOString(),
          metadata: { 
            source: 'breakroom_lms', 
            event_type, 
            ...metadata 
          }
        }, { onConflict: 'user_id,work_order_id' })

      if (!completionError) {
        // Award XP points
        await fgnClient.from('user_points').insert({
          user_id,
          points_type: 'xp',
          amount: workOrder.xp_reward ?? xp,
          source_type: 'work_order',
          source_id: workOrder.id,
          description: `Breakroom LMS: ${course_id_external}`
        })

        // Update game stats
        await fgnClient.rpc('increment_game_stats', {
          p_user_id: user_id,
          p_game_title: 'cdl_sim',
          p_xp: workOrder.xp_reward ?? xp
        }).maybeSingle()
      }

      results.fgn_completion = completionError ? 'error' : 'written'
    } else {
      results.fgn_completion = 'no_matching_work_order'
    }

    // Check and award fgn.academy achievements
    await evaluateFgnAchievements(fgnClient, user_id, event_type, score, passed)
    results.fgn_achievements = 'evaluated'

  } catch (err) {
    results.fgn_error = String(err)
  }

  // Step 3: Write to broadbandworkforce.com
  try {
    // Get the BBW user by email (shared identity anchor)
    const { data: fgnUser } = await fgnClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    // Get auth user email from fgn.academy auth
    const { data: authUser } = await fgnClient.auth.admin.getUserById(user_id)
    const email = authUser?.user?.email

    if (email) {
      // Find matching BBW user by email
      const { data: bbwAuthUsers } = await bbwClient.auth.admin.listUsers()
      const bbwUser = bbwAuthUsers?.users?.find(u => u.email === email)

      if (bbwUser) {
        const bbwUserId = bbwUser.id

        // Find matching quiz in BBW by external reference
        const { data: bbwQuiz } = await bbwClient
          .from('quizzes')
          .select('id, xp_reward, passing_score')
          .ilike('title', `%${course_id_external}%`)
          .maybeSingle()

        if (bbwQuiz) {
          // Write quiz attempt
          await bbwClient.from('quiz_attempts').insert({
            user_id: bbwUserId,
            quiz_id: bbwQuiz.id,
            score: score ?? 0,
            passed: passed ?? (score !== undefined ? score >= bbwQuiz.passing_score : false),
            xp_earned: bbwQuiz.xp_reward ?? xp,
            completed_at: new Date().toISOString(),
            attempt_number: 1
          })

          // Update BBW user_stats
          await bbwClient.rpc('update_user_stats_on_quiz', {
            p_user_id: bbwUserId,
            p_tenant_id: null,
            p_xp: bbwQuiz.xp_reward ?? xp,
            p_passed: passed ?? true
          }).maybeSingle()

          results.bbw_quiz = 'written'
        } else {
          results.bbw_quiz = 'no_matching_quiz'
        }

        // Check BBW achievements
        await evaluateBbwAchievements(bbwClient, bbwUserId, score, passed)
        results.bbw_achievements = 'evaluated'

      } else {
        results.bbw_user = 'not_found'
      }
    } else {
      results.bbw_email = 'not_resolved'
    }
  } catch (err) {
    results.bbw_error = String(err)
  }

  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

async function evaluateFgnAchievements(
  client: ReturnType<typeof createClient>,
  userId: string,
  eventType: string,
  score?: number,
  passed?: boolean
) {
  const { data: achievements } = await client
    .from('achievements')
    .select('id, trigger_type, trigger_value, xp_reward')
    .eq('is_active', true)
    .eq('trigger_type', 'breakroom_completion')

  if (!achievements?.length) return

  for (const achievement of achievements) {
    const tv = achievement.trigger_value as Record<string, unknown>
    let earned = false

    if (tv.event_type && tv.event_type !== eventType) continue
    if (tv.min_score && score !== undefined && score < Number(tv.min_score)) continue
    if (tv.requires_pass && !passed) continue

    earned = true

    if (earned) {
      await client.from('user_achievements').upsert({
        user_id: userId,
        achievement_id: achievement.id,
        earned_at: new Date().toISOString(),
        metadata: { source: 'breakroom_lms' }
      }, { onConflict: 'user_id,achievement_id' })
    }
  }
}

async function evaluateBbwAchievements(
  client: ReturnType<typeof createClient>,
  userId: string,
  score?: number,
  passed?: boolean
) {
  const { data: achievements } = await client
    .from('achievements')
    .select('id, requirement_type, requirement_value, xp_reward')
    .eq('badge_type', 'breakroom')

  if (!achievements?.length) return

  for (const achievement of achievements) {
    let earned = false
    if (achievement.requirement_type === 'quiz_pass' && passed) earned = true
    if (achievement.requirement_type === 'min_score' && score !== undefined && 
        score >= achievement.requirement_value) earned = true

    if (earned) {
      await client.from('user_achievements').upsert({
        user_id: userId,
        achievement_id: achievement.id,
        earned_at: new Date().toISOString()
      }, { onConflict: 'user_id,achievement_id' })
    }
  }
}