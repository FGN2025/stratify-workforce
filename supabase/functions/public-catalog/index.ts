import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use any for the client type to avoid Deno strict typing issues
type SupabaseClientType = SupabaseClient<any, any, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
};

// Game configuration (mirrors src/config/simResources.ts)
const GAME_CONFIG = {
  ATS: {
    name: "American Truck Simulator",
    short_name: "ATS",
    accent_color: "#3B82F6",
  },
  Farming_Sim: {
    name: "Farming Simulator",
    short_name: "Farming",
    accent_color: "#22C55E",
  },
  Construction_Sim: {
    name: "Construction Simulator",
    short_name: "Construction",
    accent_color: "#F59E0B",
  },
  Mechanic_Sim: {
    name: "Mechanic Simulator",
    short_name: "Mechanic",
    accent_color: "#EF4444",
  },
};

type GameTitle = keyof typeof GAME_CONFIG;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Remove 'public-catalog' prefix if present (function name in path)
  const basePath = pathParts[0] === "public-catalog" ? pathParts.slice(1) : pathParts;
  const endpoint = basePath[0] || "";
  const resourceId = basePath[1];

  try {
    switch (endpoint) {
      case "games":
        return await handleListGames(supabase);
      case "courses":
        if (resourceId) {
          return await handleGetCourse(supabase, resourceId);
        }
        return await handleListCourses(supabase, url.searchParams);
      case "work-orders":
        if (resourceId) {
          return await handleGetWorkOrder(supabase, resourceId);
        }
        return await handleListWorkOrders(supabase, url.searchParams);
      case "skills":
        return await handleListSkills(supabase, url.searchParams);
      default:
        return jsonResponse({
          api: "FGN.Academy Public Catalog",
          version: "1.0.0",
          endpoints: [
            "GET /games",
            "GET /courses",
            "GET /courses/:id",
            "GET /work-orders",
            "GET /work-orders/:id",
            "GET /skills?game=ATS",
          ],
        });
    }
  } catch (error) {
    console.error("Public Catalog API Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleListGames(supabase: SupabaseClientType) {
  // Get counts for each game
  const [skillsResult, workOrdersResult, coursesResult] = await Promise.all([
    supabase
      .from("skills_taxonomy")
      .select("game_title", { count: "exact", head: false })
      .eq("is_active", true),
    supabase
      .from("work_orders")
      .select("game_title", { count: "exact", head: false })
      .eq("is_active", true),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: false })
      .eq("is_published", true),
  ]);

  // Count skills per game
  const skillsCounts: Record<string, number> = {};
  (skillsResult.data || []).forEach((row: { game_title: string }) => {
    skillsCounts[row.game_title] = (skillsCounts[row.game_title] || 0) + 1;
  });

  // Count work orders per game
  const workOrdersCounts: Record<string, number> = {};
  (workOrdersResult.data || []).forEach((row: { game_title: string }) => {
    workOrdersCounts[row.game_title] = (workOrdersCounts[row.game_title] || 0) + 1;
  });

  // Courses don't have game_title, so we use total count
  const totalCourses = coursesResult.count || 0;

  const games = Object.entries(GAME_CONFIG).map(([key, config]) => ({
    key,
    name: config.name,
    short_name: config.short_name,
    accent_color: config.accent_color,
    skills_count: skillsCounts[key] || 0,
    work_orders_count: workOrdersCounts[key] || 0,
    courses_count: key === "ATS" ? totalCourses : 0, // For now, courses are game-agnostic
  }));

  return jsonResponse({ games });
}

async function handleListCourses(
  supabase: SupabaseClientType,
  params: URLSearchParams
) {
  const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
  const offset = parseInt(params.get("offset") || "0");
  const difficulty = params.get("difficulty");

  let query = supabase
    .from("courses")
    .select(
      `
      id,
      title,
      description,
      cover_image_url,
      difficulty_level,
      estimated_hours,
      xp_reward,
      created_at,
      modules:modules(count),
      lessons:modules(lessons(count))
    `,
      { count: "exact" }
    )
    .eq("is_published", true)
    .is("tenant_id", null) // Only global courses for public API
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (difficulty) {
    query = query.eq("difficulty_level", difficulty);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("List courses error:", error);
    return jsonResponse({ error: "Failed to fetch courses" }, 500);
  }

  // Transform to flatten counts
  const courses = (data || []).map((course: any) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    cover_image_url: course.cover_image_url,
    difficulty_level: course.difficulty_level,
    estimated_hours: course.estimated_hours,
    xp_reward: course.xp_reward,
    module_count: course.modules?.[0]?.count || 0,
    lesson_count: course.lessons?.reduce(
      (sum: number, m: any) => sum + (m.lessons?.[0]?.count || 0),
      0
    ) || 0,
    created_at: course.created_at,
  }));

  return jsonResponse({
    courses,
    total: count || 0,
    limit,
    offset,
  });
}

async function handleGetCourse(
  supabase: SupabaseClientType,
  courseId: string
) {
  const { data: course, error } = await supabase
    .from("courses")
    .select(
      `
      id,
      title,
      description,
      cover_image_url,
      difficulty_level,
      estimated_hours,
      xp_reward,
      created_at,
      modules(
        id,
        title,
        description,
        order_index,
        xp_reward,
        lessons(
          id,
          title,
          lesson_type,
          duration_minutes,
          xp_reward,
          order_index
        )
      )
    `
    )
    .eq("id", courseId)
    .eq("is_published", true)
    .is("tenant_id", null)
    .single();

  if (error || !course) {
    return jsonResponse({ error: "Course not found" }, 404);
  }

  // Sort modules and lessons by order_index
  const sortedModules = (course.modules || [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((module: any) => ({
      ...module,
      lessons: (module.lessons || []).sort(
        (a: any, b: any) => a.order_index - b.order_index
      ),
    }));

  return jsonResponse({
    course: {
      ...course,
      modules: sortedModules,
    },
  });
}

async function handleListWorkOrders(
  supabase: SupabaseClientType,
  params: URLSearchParams
) {
  const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
  const offset = parseInt(params.get("offset") || "0");
  const game = params.get("game") as GameTitle | null;
  const difficulty = params.get("difficulty");

  let query = supabase
    .from("work_orders")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .is("tenant_id", null) // Only global work orders for public API
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (game && GAME_CONFIG[game]) {
    query = query.eq("game_title", game);
  }

  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("List work orders error:", error);
    return jsonResponse({ error: "Failed to fetch work orders" }, 500);
  }

  // Transform to public format (exclude internal fields)
  const workOrders = (data || []).map((wo: any) => ({
    id: wo.id,
    title: wo.title,
    description: wo.description,
    game_title: wo.game_title,
    difficulty: wo.difficulty,
    xp_reward: wo.xp_reward,
    estimated_time_minutes: wo.estimated_time_minutes,
    success_criteria: wo.success_criteria,
    created_at: wo.created_at,
  }));

  return jsonResponse({
    work_orders: workOrders,
    total: count || 0,
    limit,
    offset,
  });
}

async function handleGetWorkOrder(
  supabase: SupabaseClientType,
  workOrderId: string
) {
  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", workOrderId)
    .eq("is_active", true)
    .is("tenant_id", null)
    .single();

  if (error || !workOrder) {
    return jsonResponse({ error: "Work order not found" }, 404);
  }

  return jsonResponse({
    work_order: {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      game_title: workOrder.game_title,
      difficulty: workOrder.difficulty,
      xp_reward: workOrder.xp_reward,
      estimated_time_minutes: workOrder.estimated_time_minutes,
      max_attempts: workOrder.max_attempts,
      success_criteria: workOrder.success_criteria,
      evidence_requirements: workOrder.evidence_requirements,
      created_at: workOrder.created_at,
    },
  });
}

async function handleListSkills(
  supabase: SupabaseClientType,
  params: URLSearchParams
) {
  const game = params.get("game") as GameTitle | null;

  if (!game || !GAME_CONFIG[game]) {
    return jsonResponse(
      { error: "game parameter required (ATS, Farming_Sim, etc.)" },
      400
    );
  }

  const { data, error } = await supabase
    .from("skills_taxonomy")
    .select("skill_key, skill_name, category, description")
    .eq("game_title", game)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("List skills error:", error);
    return jsonResponse({ error: "Failed to fetch skills" }, 500);
  }

  const skills = (data || []).map((skill: any) => ({
    key: skill.skill_key,
    name: skill.skill_name,
    category: skill.category,
    description: skill.description,
  }));

  return jsonResponse({
    game,
    skills,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
