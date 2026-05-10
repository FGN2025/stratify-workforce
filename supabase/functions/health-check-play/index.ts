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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    let apiKey: string | null = null;
    try {
      const body = await req.json();
      apiKey = body.api_key || null;
    } catch { /* no body fine */ }

    const playFgnResult = await testEcosystemDataApi();

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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Health check failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function testEcosystemDataApi(): Promise<{
  status: string;
  latency_ms: number;
  challenge_count?: number;
  academy_key_configured?: boolean;
  error?: string;
}> {
  const playUrl = Deno.env.get("FGN_PLAY_SUPABASE_URL");
  const ecosystemKey = Deno.env.get("ECOSYSTEM_API_KEY");

  if (!playUrl) {
    return { status: "fail", latency_ms: 0, error: "FGN_PLAY_SUPABASE_URL not configured" };
  }
  if (!ecosystemKey) {
    return { status: "fail", latency_ms: 0, error: "ECOSYSTEM_API_KEY not configured" };
  }

  const start = performance.now();
  try {
    const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ecosystem-Key": ecosystemKey,
        "X-Ecosystem-App": "academy",
      },
      body: JSON.stringify({ action: "health" }),
    });
    const latency = Math.round(performance.now() - start);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: "fail",
        latency_ms: latency,
        error: `ecosystem-data-api ${res.status}: ${data?.error || res.statusText}`,
      };
    }

    return {
      status: "pass",
      latency_ms: latency,
      challenge_count: data?.counts?.challenges ?? data?.challenge_count,
      academy_key_configured: data?.services?.academy_key_configured,
    };
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
  apiKey: string,
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
      },
    );
    const latency = Math.round(performance.now() - start);
    const data = await res.json();
    if (res.status === 401 || res.status === 403) {
      return { status: "fail", latency_ms: latency, error: `API key rejected (${res.status}): ${data.error || "Unauthorized"}` };
    }
    return { status: "pass", latency_ms: latency };
  } catch (err) {
    return {
      status: "fail",
      latency_ms: Math.round(performance.now() - start),
      error: String(err),
    };
  }
}
