import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Telemetry payload types
interface TelemetryPayload {
  action: "start" | "update" | "complete";
  session_id?: string;
  work_order_id?: string;
  game_title: "ATS" | "Farming_Sim" | "Construction_Sim" | "Mechanic_Sim";
  data: {
    play_time_minutes?: number;
    score?: number;
    speed?: number;
    rpm?: number;
    fuel_efficiency?: number;
    damage?: number;
    distance_traveled?: number;
    cargo_delivered?: boolean;
    raw?: Record<string, unknown>;
  };
}

interface SessionResponse {
  session_id: string;
  status: "started" | "updated" | "completed";
  xp_awarded?: number;
  work_order_completed?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Use SUPABASE_ANON_KEY (standard edge function secret)
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse payload
    const payload: TelemetryPayload = await req.json();
    
    // Validate required fields
    if (!payload.action || !payload.game_title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, game_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validGameTitles = ["ATS", "Farming_Sim", "Construction_Sim", "Mechanic_Sim"];
    if (!validGameTitles.includes(payload.game_title)) {
      return new Response(
        JSON.stringify({ error: "Invalid game_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let response: SessionResponse;

    switch (payload.action) {
      case "start": {
        // Create new telemetry session
        const { data: session, error: sessionError } = await supabase
          .from("telemetry_sessions")
          .insert({
            user_id: user.id,
            work_order_id: payload.work_order_id || null,
            raw_data: payload.data?.raw || {},
          })
          .select("id")
          .single();

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          throw new Error("Failed to create session");
        }

        // Increment session count in user_game_stats
        await upsertGameStats(supabase, user.id, payload.game_title, {
          incrementSessions: true,
        });

        response = {
          session_id: session.id,
          status: "started",
        };
        break;
      }

      case "update": {
        if (!payload.session_id) {
          return new Response(
            JSON.stringify({ error: "session_id required for update action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update session with latest data
        const { error: updateError } = await supabase
          .from("telemetry_sessions")
          .update({
            raw_data: payload.data?.raw || {},
          })
          .eq("id", payload.session_id)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Session update error:", updateError);
          throw new Error("Failed to update session");
        }

        // Update play time
        if (payload.data?.play_time_minutes) {
          await upsertGameStats(supabase, user.id, payload.game_title, {
            addPlayTime: payload.data.play_time_minutes,
          });
        }

        response = {
          session_id: payload.session_id,
          status: "updated",
        };
        break;
      }

      case "complete": {
        if (!payload.session_id) {
          return new Response(
            JSON.stringify({ error: "session_id required for complete action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const finalScore = payload.data?.score || 0;

        // Complete the session
        const { error: completeError } = await supabase
          .from("telemetry_sessions")
          .update({
            completed_at: new Date().toISOString(),
            final_score: finalScore,
            raw_data: payload.data?.raw || {},
          })
          .eq("id", payload.session_id)
          .eq("user_id", user.id);

        if (completeError) {
          console.error("Session complete error:", completeError);
          throw new Error("Failed to complete session");
        }

        // Update game stats with final metrics
        await upsertGameStats(supabase, user.id, payload.game_title, {
          addPlayTime: payload.data?.play_time_minutes || 0,
          addScore: finalScore,
          checkBestScore: finalScore,
        });

        // Check work order completion if tied to one
        let workOrderCompleted = false;
        let xpAwarded = 0;

        if (payload.work_order_id) {
          const result = await checkWorkOrderCompletion(
            supabase,
            user.id,
            payload.work_order_id,
            payload.game_title,
            finalScore,
            payload.data
          );
          workOrderCompleted = result.completed;
          xpAwarded = result.xpAwarded;
        }

        response = {
          session_id: payload.session_id,
          status: "completed",
          work_order_completed: workOrderCompleted,
          xp_awarded: xpAwarded,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: start, update, complete" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Telemetry ingest error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Upsert user_game_stats
// deno-lint-ignore no-explicit-any
async function upsertGameStats(
  supabase: any,
  userId: string,
  gameTitle: string,
  updates: {
    incrementSessions?: boolean;
    addPlayTime?: number;
    addScore?: number;
    checkBestScore?: number;
    incrementWorkOrders?: boolean;
  }
) {
  // Get existing stats
  const { data: existing } = await supabase
    .from("user_game_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("game_title", gameTitle)
    .maybeSingle();

  if (existing) {
    // Update existing record
    // deno-lint-ignore no-explicit-any
    const updateData: Record<string, any> = {
      last_played_at: new Date().toISOString(),
    };

    if (updates.incrementSessions) {
      updateData.total_sessions = existing.total_sessions + 1;
    }
    if (updates.addPlayTime) {
      updateData.total_play_time_minutes = existing.total_play_time_minutes + updates.addPlayTime;
    }
    if (updates.addScore) {
      updateData.total_score = Number(existing.total_score) + updates.addScore;
    }
    if (updates.checkBestScore !== undefined) {
      if (!existing.best_score || updates.checkBestScore > Number(existing.best_score)) {
        updateData.best_score = updates.checkBestScore;
      }
    }
    if (updates.incrementWorkOrders) {
      updateData.work_orders_completed = existing.work_orders_completed + 1;
    }

    await supabase
      .from("user_game_stats")
      .update(updateData)
      .eq("id", existing.id);
  } else {
    // Insert new record
    await supabase.from("user_game_stats").insert({
      user_id: userId,
      game_title: gameTitle,
      total_sessions: updates.incrementSessions ? 1 : 0,
      total_play_time_minutes: updates.addPlayTime || 0,
      total_score: updates.addScore || 0,
      best_score: updates.checkBestScore || null,
      work_orders_completed: updates.incrementWorkOrders ? 1 : 0,
      last_played_at: new Date().toISOString(),
    });
  }
}

// Helper: Check if work order is completed
// deno-lint-ignore no-explicit-any
async function checkWorkOrderCompletion(
  supabase: any,
  userId: string,
  workOrderId: string,
  gameTitle: string,
  score: number,
  data: TelemetryPayload["data"]
): Promise<{ completed: boolean; xpAwarded: number }> {
  // Get work order with criteria
  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", workOrderId)
    .single();

  if (error || !workOrder) {
    console.error("Work order fetch error:", error);
    return { completed: false, xpAwarded: 0 };
  }

  // Check if game matches
  if (workOrder.game_title !== gameTitle) {
    return { completed: false, xpAwarded: 0 };
  }

  // Check success criteria
  const criteria = workOrder.success_criteria || { min_score: 80, max_damage: 5 };
  let passed = true;

  if (criteria.min_score && score < criteria.min_score) {
    passed = false;
  }
  if (criteria.max_damage && data?.damage && data.damage > criteria.max_damage) {
    passed = false;
  }

  if (!passed) {
    // Record failed attempt
    await supabase.from("user_work_order_completions").insert({
      user_id: userId,
      work_order_id: workOrderId,
      status: "failed",
      score: score,
      completed_at: new Date().toISOString(),
    });
    return { completed: false, xpAwarded: 0 };
  }

  // Record successful completion
  const xpReward = workOrder.xp_reward || 50;

  await supabase.from("user_work_order_completions").insert({
    user_id: userId,
    work_order_id: workOrderId,
    status: "completed",
    score: score,
    xp_awarded: xpReward,
    completed_at: new Date().toISOString(),
  });

  // Award XP points
  await supabase.from("user_points").insert({
    user_id: userId,
    amount: xpReward,
    points_type: "xp",
    source_type: "work_order",
    source_id: workOrderId,
    description: `Completed: ${workOrder.title}`,
  });

  // Update game stats work order count
  await upsertGameStats(supabase, userId, gameTitle, {
    incrementWorkOrders: true,
  });

  return { completed: true, xpAwarded: xpReward };
}
