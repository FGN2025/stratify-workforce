import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
}

interface BreakroomPayload {
  breakroom_username: string
  event_type: 'course_complete' | 'quiz_complete' | 'module_complete'
  course_id_external: string
  score?: number
  passed?: boolean
  xp_reward?: number
  completion_time_minutes?: number
  metadata?: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== Deno.env.get('BREAKROOM_SYNC_SECRET')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: BreakroomPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const {
    breakroom_username, event_type, course_id_external,
    score, passed, xp_reward, completion_time_minutes, metadata
  } = payload

  if (!breakroom_username || !event_type || !course_id_external) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: breakroom_username, event_type, course_id_external' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const fgnClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const bbwClient = createClient(
    Deno.env.get('BBW_SUPABASE_URL')!,
    Deno.env.get('BBW_SUPABASE_SERVICE_ROLE_KEY')!
  )

  const xp = xp_reward ?? 100
  const results: Record<string, unknown> = {}

  // Step 1: Resolve Breakroom username to FGN user_id
  const { data: identity, error: identityError } = await fgnClient
    .from('breakroom_identity')
    .select('user_id, tenant_id')
    .eq('breakroom_username', breakroom_username)
    .single()

  if (identityError || !identity) {
    return new Response(
      JSON.stringify({ error: 'Unknown Breakroom user', breakroom_username }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { user_id, tenant_id } = identity

  // Step 2: Resolve email for cross-platform identity
  const { data: authData } = await fgnClient.auth.admin.getUserById(user_id)
  const email = authData?.user?.email ?? null
  results.email_resolved = !!email

  // Step 3: Write to fgn.academy
  try {
    const { data: workOrder } = await fgnClient
      .from('work_orders')
      .select('id, xp_reward, game_title')
      .eq('source_challenge_id', course_id_external)
      .eq('is_active', true)
      .maybeSingle()

    if (workOrder) {
      const woXp = workOrder.xp_reward ?? xp
      const completionStatus = passed !== false ? 'completed' : 'failed'

      const { error: completionError } = await fgnClient
        .from('user_work_order_completions')
        .upsert({
          user_id,
          work_order_id: workOrder.id,
          status: completionStatus,
          score: score ?? null,
          xp_awarded: woXp,
          attempt_number: 1,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          metadata: { source: 'breakroom_lms', event_type, ...metadata }
        }, { onConflict: 'user_id,work_order_id' })

      if (!completionError && completionStatus === 'completed') {
        const quizKeyPart = (metadata as Record<string, unknown> | undefined)?.breakroom_quiz_id
          ?? course_id_external
        const woEventKey = `breakroom:wo:${workOrder.id}:quiz:${quizKeyPart}`
        await fgnClient.from('user_points').upsert({
          user_id,
          points_type: 'xp',
          amount: woXp,
          source_type: 'work_order',
          source_id: workOrder.id,
          description: `Breakroom LMS completion: ${course_id_external}`,
          event_key: woEventKey,
        }, { onConflict: 'user_id,event_key', ignoreDuplicates: true })

        const { data: existingStats } = await fgnClient
          .from('user_game_stats')
          .select('id, work_orders_completed, total_score, total_play_time_minutes')
          .eq('user_id', user_id)
          .eq('game_title', workOrder.game_title)
          .maybeSingle()

        if (existingStats) {
          await fgnClient
            .from('user_game_stats')
            .update({
              work_orders_completed: (existingStats.work_orders_completed ?? 0) + 1,
              total_score: (existingStats.total_score ?? 0) + (score ?? 0),
              total_play_time_minutes: (existingStats.total_play_time_minutes ?? 0) + (completion_time_minutes ?? 0),
              last_played_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingStats.id)
        } else {
          await fgnClient.from('user_game_stats').insert({
            user_id,
            game_title: workOrder.game_title,
            work_orders_completed: 1,
            total_score: score ?? 0,
            total_play_time_minutes: completion_time_minutes ?? 0,
            last_played_at: new Date().toISOString()
          })
        }

        // Notify the user that their spatial task was verified
        if (!completionError && completionStatus === 'completed') {
          const courseLabel = (metadata as Record<string, unknown> | undefined)?.breakroom_course_name
            ?? (metadata as Record<string, unknown> | undefined)?.quiz_name
            ?? course_id_external
          await fgnClient.from('user_notifications').insert({
            user_id,
            type: 'achievement',
            title: 'Spatial task verified',
            message: `${courseLabel} — +${woXp} XP added to your Skill Passport via Breakroom.`,
            icon_name: 'Boxes',
            accent_color: 'hsl(var(--secondary))',
            link_url: `/work-orders/${workOrder.id}`,
            metadata: {
              source: 'breakroom_lms',
              work_order_id: workOrder.id,
              xp_awarded: woXp,
              event_type,
            },
          })
        }
      }

      results.fgn_completion = completionError
        ? `error: ${completionError.message}`
        : completionStatus

    } else {
      results.fgn_completion = 'no_matching_work_order'
    }

    results.fgn_achievements = await evaluateFgnAchievements(
      fgnClient, user_id, event_type, score, passed,
      (metadata as Record<string, unknown> | undefined)?.breakroom_quiz_id ?? course_id_external
    )

  } catch (err) {
    results.fgn_error = String(err)
  }

  // Step 4: Write to broadbandworkforce.com
  if (email) {
    try {
      const { data: bbwUsers } = await bbwClient.auth.admin.listUsers()
      const bbwUser = bbwUsers?.users?.find(u => u.email === email)

      if (!bbwUser) {
        results.bbw = 'user_not_found'
      } else {
        const bbwUserId = bbwUser.id

        const { data: bbwQuiz } = await bbwClient
          .from('quizzes')
          .select('id, xp_reward, passing_score, course_id')
          .ilike('title', `%${course_id_external}%`)
          .eq('is_active', true)
          .maybeSingle()

        if (bbwQuiz) {
          const bbwPassed = passed ?? (score !== undefined
            ? score >= (bbwQuiz.passing_score ?? 70)
            : false)
          const bbwXp = bbwQuiz.xp_reward ?? xp

          const { count: attemptCount } = await bbwClient
            .from('quiz_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', bbwUserId)
            .eq('quiz_id', bbwQuiz.id)

          await bbwClient.from('quiz_attempts').insert({
            user_id: bbwUserId,
            quiz_id: bbwQuiz.id,
            score: score ?? 0,
            passed: bbwPassed,
            xp_earned: bbwXp,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            attempt_number: (attemptCount ?? 0) + 1
          })

          const { data: linkedLesson } = await bbwClient
            .from('lessons')
            .select('id')
            .eq('external_content_id', course_id_external)
            .maybeSingle()

          if (linkedLesson) {
            await bbwClient.from('lesson_progress').upsert({
              user_id: bbwUserId,
              lesson_id: linkedLesson.id,
              is_completed: bbwPassed,
              xp_earned: bbwXp,
              started_at: new Date().toISOString(),
              completed_at: bbwPassed ? new Date().toISOString() : null,
              time_spent_seconds: (completion_time_minutes ?? 0) * 60
            }, { onConflict: 'user_id,lesson_id' })
          }

          if (bbwPassed && bbwQuiz.course_id) {
            const { count: totalLessons } = await bbwClient
              .from('lessons')
              .select('id', { count: 'exact', head: true })
              .eq('module_id', bbwQuiz.course_id)

            const { count: completedLessons } = await bbwClient
              .from('lesson_progress')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', bbwUserId)
              .eq('is_completed', true)

            if (totalLessons && completedLessons && completedLessons >= totalLessons) {
              await bbwClient
                .from('enrollments')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString()
                })
                .eq('user_id', bbwUserId)
                .eq('course_id', bbwQuiz.course_id)
            }
          }

          const { data: bbwStats } = await bbwClient
            .from('user_stats')
            .select('id, total_xp, quizzes_passed, total_learning_time_minutes')
            .eq('user_id', bbwUserId)
            .maybeSingle()

          if (bbwStats) {
            await bbwClient
              .from('user_stats')
              .update({
                total_xp: (bbwStats.total_xp ?? 0) + bbwXp,
                quizzes_passed: (bbwStats.quizzes_passed ?? 0) + (bbwPassed ? 1 : 0),
                total_learning_time_minutes: (bbwStats.total_learning_time_minutes ?? 0) + (completion_time_minutes ?? 0),
                last_activity_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
              })
              .eq('id', bbwStats.id)
          } else {
            await bbwClient.from('user_stats').insert({
              user_id: bbwUserId,
              total_xp: bbwXp,
              quizzes_passed: bbwPassed ? 1 : 0,
              total_learning_time_minutes: completion_time_minutes ?? 0,
              last_activity_date: new Date().toISOString().split('T')[0]
            })
          }

          results.bbw_quiz = 'written'
          results.bbw_passed = bbwPassed

        } else {
          results.bbw_quiz = 'no_matching_quiz'
        }

        results.bbw_achievements = await evaluateBbwAchievements(
          bbwClient, bbwUserId, score, passed
        )
      }
    } catch (err) {
      results.bbw_error = String(err)
    }
  } else {
    results.bbw = 'skipped_no_email'
  }

  // Step 5: Audit log
  await fgnClient.from('system_audit_logs').insert({
    actor_id: user_id,
    action: 'breakroom_lms_sync',
    resource_type: 'work_order',
    resource_id: course_id_external,
    details: { breakroom_username, event_type, score, passed, results }
  })

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

async function evaluateFgnAchievements(
  client: ReturnType<typeof createClient>,
  userId: string,
  eventType: string,
  score?: number,
  passed?: boolean
): Promise<string> {
  const { data: achievements } = await client
    .from('achievements')
    .select('id, trigger_type, trigger_value, xp_reward')
    .eq('is_active', true)
    .eq('trigger_type', 'breakroom_completion')

  if (!achievements?.length) return 'none_configured'

  let awarded = 0
  for (const achievement of achievements) {
    const tv = (achievement.trigger_value ?? {}) as Record<string, unknown>
    if (tv.event_type && tv.event_type !== eventType) continue
    if (tv.min_score !== undefined && score !== undefined && score < Number(tv.min_score)) continue
    if (tv.requires_pass === true && !passed) continue

    const { data: existing } = await client
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id)
      .maybeSingle()

    if (!existing) {
      await client.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
        earned_at: new Date().toISOString(),
        metadata: { source: 'breakroom_lms', event_type: eventType, score }
      })

      if (achievement.xp_reward) {
        await client.from('user_points').insert({
          user_id: userId,
          points_type: 'xp',
          amount: achievement.xp_reward,
          source_type: 'achievement',
          source_id: achievement.id,
          description: 'Achievement unlocked via Breakroom LMS'
        })
      }
      awarded++
    }
  }

  return `${awarded}_awarded`
}

async function evaluateBbwAchievements(
  client: ReturnType<typeof createClient>,
  userId: string,
  score?: number,
  passed?: boolean
): Promise<string> {
  const { data: achievements } = await client
    .from('achievements')
    .select('id, requirement_type, requirement_value, xp_reward')
    .eq('badge_type', 'breakroom')

  if (!achievements?.length) return 'none_configured'

  let awarded = 0
  for (const achievement of achievements) {
    let earned = false
    if (achievement.requirement_type === 'quiz_pass' && passed) earned = true
    if (achievement.requirement_type === 'min_score' &&
        score !== undefined &&
        score >= achievement.requirement_value) earned = true

    if (!earned) continue

    const { data: existing } = await client
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id)
      .maybeSingle()

    if (!existing) {
      await client.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
        earned_at: new Date().toISOString()
      })
      awarded++
    }
  }

  return `${awarded}_awarded`
}
