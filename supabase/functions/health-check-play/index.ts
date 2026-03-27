import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional api_key from body
    let apiKey: string | null = null;
    try {
      const body = await req.json();
      apiKey = body.api_key || null;
    } catch {
      // No body is fine
    }

    // --- Test 1: play.fgn.gg connection ---
    const playFgnResult = await testPlayFgnConnection();

    // --- Test 2: sync endpoint (optional, requires api_key) ---
    let syncResult: { status: string; latency_ms: number; error?: string } = {
      status: "skipped",
      latency_ms: 0,
      error: "No API key provided — sync endpoint test skipped",
    };

    if (apiKey) {
      syncResult = await testSyncEndpoint(supabaseUrl, authHeader, apiKey);
    }

    return new Response(
      JSON.stringify({
        play_fgn_connection: playFgnResult,
        sync_endpoint: syncResult,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Health check failed", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function testPlayFgnConnection(): Promise<{
  status: string;
  latency_ms: number;
  challenge_count?: number;
  error?: string;
}> {
  const playFgnAnonKey = Deno.env.get("PLAY_FGN_ANON_KEY");
  if (!playFgnAnonKey) {
    return { status: "fail", latency_ms: 0, error: "PLAY_FGN_ANON_KEY not configured" };
  }

  const PLAY_FGN_URL = "https://ragxkftmafhuorjykiii.supabase.co";
  const start = performance.now();

  try {
    const client = createClient(PLAY_FGN_URL, playFgnAnonKey);
    const { count, error } = await client
      .from("challenges")
      .select("*", { count: "exact", head: true });

    const latency = Math.round(performance.now() - start);

    if (error) {
      return { status: "fail", latency_ms: latency, error: error.message };
    }

    return { status: "pass", latency_ms: latency, challenge_count: count ?? 0 };
  } catch (err) {
    return {
      status: "fail",
      latency_ms: Math.round(performance.now() - start),
      error: String(err),
    };
  }
}

async function testSyncEndpoint(
  supabaseUrl: string,
  authHeader: string,
  apiKey: string
): Promise<{ status: string; latency_ms: number; error?: string }> {
  const start = performance.now();

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/sync-challenge-completion`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          "X-App-Key": apiKey,
        },
        body: JSON.stringify({
          user_email: "health-check-probe@invalid.test",
          challenge_id: "00000000-0000-0000-0000-000000000000",
          score: 0,
        }),
      }
    );

    const latency = Math.round(performance.now() - start);
    const data = await res.json();

    // 401/403 = API key is invalid
    if (res.status === 401 || res.status === 403) {
      return { status: "fail", latency_ms: latency, error: `API key rejected (${res.status}): ${data.error || "Unauthorized"}` };
    }

    // 404 with "User not found" or "No work order" = auth passed, endpoint works
    if (res.status === 404) {
      return { status: "pass", latency_ms: latency };
    }

    // Any other structured response means endpoint is reachable
    return { status: "pass", latency_ms: latency };
  } catch (err) {
    return {
      status: "fail",
      latency_ms: Math.round(performance.now() - start),
      error: String(err),
    };
  }
}
