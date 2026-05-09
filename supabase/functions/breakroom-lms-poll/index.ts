import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
}

const BREAKROOM_STUDENTS_URL = 'https://curator.sine.space/web/breakroom/grid/lms/course/members/all/list'
const BREAKROOM_QUIZZES_URL = 'https://curator.sine.space/web/breakroom/grid/lms/quiz/user/list'
const GRID_ID = 257

interface BreakroomStudent {
  id: number
  name: string
  displayname: string
  course: { id: number; name: string }
}

interface BreakroomQuizInfo {
  id: number
  grade: number
  status: number
  date: string
}

interface BreakroomQuiz {
  id: number
  name: string
  courseId: number
  attempts: number
  StudentsQuizInfo: BreakroomQuizInfo[]
}

interface PollResults {
  students_found: number
  quizzes_found: number
  already_synced: number
  skipped_unmapped: number
  synced: number
  sync_errors: number
  errors: string[]
}

function getBreakroomHeaders(token: string): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': `Bearer ${token}`,
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    'Origin': 'https://curator.sine.space',
    'Pragma': 'no-cache',
    'Referer': 'https://curator.sine.space/grid/dashboard?grid=257',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    'Cookie': Deno.env.get('BREAKROOM_SESSION_COOKIES') ?? '',
  }
}

async function getBreakroomToken(): Promise<string | null> {
  const token = Deno.env.get('BREAKROOM_SESSION_TOKEN')
  if (!token) {
    console.error('BREAKROOM_SESSION_TOKEN secret not configured')
    return null
  }
  return token
}

async function fetchAllStudents(token: string): Promise<BreakroomStudent[]> {
  const allStudents: BreakroomStudent[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const res = await fetch(BREAKROOM_STUDENTS_URL, {
      method: 'POST',
      headers: getBreakroomHeaders(token),
      body: JSON.stringify({
        GridId: GRID_ID,
        Search: '',
        Page: page,
        PageSize: pageSize,
        OrderBy: '',
        Desc: '',
        CourseId: 0,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Students fetch failed (${res.status}): ${text.slice(0, 300)}`)
    }

    const data = await res.json()
    const students: BreakroomStudent[] = data.Students || data.students || []
    allStudents.push(...students)

    if (students.length < pageSize) break
    page++
  }

  return allStudents
}

async function fetchCompletedQuizzes(token: string, userId: number): Promise<BreakroomQuiz[]> {
  const allQuizzes: BreakroomQuiz[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const res = await fetch(BREAKROOM_QUIZZES_URL, {
      method: 'POST',
      headers: getBreakroomHeaders(token),
      body: JSON.stringify({
        GridId: GRID_ID,
        UserId: userId,
        Type: 1,
        Status: 1,
        IsGraded: false,
        Page: page,
        PageSize: pageSize,
        OrderBy: '',
        Desc: '',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Quizzes fetch failed for user ${userId} (${res.status}): ${text.slice(0, 300)}`)
    }

    const data = await res.json()
    const quizzes: BreakroomQuiz[] = data.MemberQuizzes || data.memberQuizzes || []
    allQuizzes.push(...quizzes)

    if (quizzes.length < pageSize) break
    page++
  }

  return allQuizzes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const syncSecret = Deno.env.get('BREAKROOM_SYNC_SECRET')!

  const fgnClient = createClient(supabaseUrl, serviceRoleKey)

  const results: PollResults = {
    students_found: 0,
    quizzes_found: 0,
    already_synced: 0,
    synced: 0,
    sync_errors: 0,
    errors: [],
  }

  try {
    const token = await getBreakroomToken()
    if (!token) {
      results.errors.push('BREAKROOM_SESSION_TOKEN secret not configured')
      throw new Error('No session token')
    }

    const students = await fetchAllStudents(token)
    results.students_found = students.length

    const breakroomUserIds = students.map(s => s.id)
    const { data: identities } = await fgnClient
      .from('breakroom_identity')
      .select('user_id, breakroom_user_id, breakroom_username')
      .in('breakroom_user_id', breakroomUserIds)

    const identityMap = new Map(
      (identities || []).map(i => [i.breakroom_user_id, i])
    )

    const { data: workOrders } = await fgnClient
      .from('work_orders')
      .select('id, source_challenge_id, xp_reward, metadata, title')
      .eq('is_active', true)

    for (const student of students) {
      const identity = identityMap.get(student.id)
      if (!identity) continue

      let quizzes: BreakroomQuiz[]
      try {
        quizzes = await fetchCompletedQuizzes(token, student.id)
      } catch (err) {
        results.errors.push(`Quiz fetch error for ${student.name}: ${String(err)}`)
        continue
      }

      for (const quiz of quizzes) {
        results.quizzes_found++

        const latestInfo = quiz.StudentsQuizInfo
          ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

        if (!latestInfo) continue

        const { count } = await fgnClient
          .from('user_work_order_completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', identity.user_id)
          .filter('metadata->>breakroom_quiz_id', 'eq', String(quiz.id))

        if (count && count > 0) {
          results.already_synced++
          continue
        }

        let matchedWorkOrder = (workOrders || []).find(wo => {
          const meta = wo.metadata as Record<string, unknown> | null
          if (meta?.breakroom_course_name) {
            return meta.breakroom_course_name === quiz.name ||
                   meta.breakroom_course_name === student.course.name
          }
          return false
        })

        if (!matchedWorkOrder) {
          matchedWorkOrder = (workOrders || []).find(wo =>
            wo.title?.toLowerCase().includes(quiz.name.toLowerCase()) ||
            quiz.name.toLowerCase().includes(wo.title?.toLowerCase() || '')
          )
        }

        const sourceId = matchedWorkOrder?.source_challenge_id || quiz.name
        const xpReward = matchedWorkOrder?.xp_reward || 100
        const grade = latestInfo.grade === -1 ? null : latestInfo.grade

        try {
          const syncRes = await fetch(`${supabaseUrl}/functions/v1/breakroom-lms-sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': syncSecret,
            },
            body: JSON.stringify({
              breakroom_username: identity.breakroom_username,
              event_type: 'quiz_complete',
              course_id_external: sourceId,
              score: grade,
              passed: true,
              xp_reward: xpReward,
              completion_time_minutes: 0,
              metadata: {
                breakroom_quiz_id: quiz.id,
                breakroom_user_id: student.id,
                breakroom_course_id: quiz.courseId,
                completion_date: latestInfo.date,
                polled: true,
              },
            }),
          })

          const syncBody = await syncRes.text()
          if (syncRes.ok) {
            results.synced++
          } else {
            results.sync_errors++
            results.errors.push(`Sync error for ${student.name}/${quiz.name}: ${syncRes.status} ${syncBody.slice(0, 200)}`)
          }
        } catch (err) {
          results.sync_errors++
          results.errors.push(`Sync call error for ${student.name}/${quiz.name}: ${String(err)}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Top-level error: ${String(err)}`)
  }

  // Audit log
  try {
    await fgnClient.from('system_audit_logs').insert({
      action: 'breakroom_lms_poll',
      resource_type: 'breakroom_poll',
      details: results,
    })
  } catch (_) {
    // silent
  }

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
