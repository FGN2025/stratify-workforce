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

    // Prefer a pasted authorized-app key (X-App-Key). Otherwise fall back to the
    // stored ECOSYSTEM_API_KEY (X-Ecosystem-Key), which sync-challenge-completion
    // also accepts — this validates the rotated ecosystem key end to end.
    let syncResult: { status: string; latency_ms: number; error?: string } = {
      status: "skipped",
      latency_ms: 0,
      error: "No API key provided and ECOSYSTEM_API_KEY not configured — sync endpoint test skipped",
    };
    if (apiKey) {
      syncResult = await testSyncEndpoint(supabaseUrl, authHeader, apiKey, "x-app-key");
    } else {
      const ecosystemKey = Deno.env.get("ECOSYSTEM_API_KEY");
      if (ecosystemKey) {
        syncResult = await testSyncEndpoint(supabaseUrl, authHeader, ecosystemKey, "x-ecosystem-key");
      }
    }

    // Canonical Simulation Activity identity checks. Every one of these hits the
    // live FGN.GG API — a locally cached activity is never treated as proof.
    const canonicalResult = await testCanonicalIdentity();

    return new Response(
      JSON.stringify({
        play_fgn_connection: playFgnResult,
        sync_endpoint: syncResult,
        canonical_identity: canonicalResult,
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
  keyHeader: "x-app-key" | "x-ecosystem-key" = "x-app-key",
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
          [keyHeader]: apiKey,
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

// ---------------------------------------------------------------------------
// Canonical Simulation Activity identity health (Phase 1B).
//
// Live checks only. A cache hit in simulation_activity_cache is never accepted
// as evidence of health — every assertion below is answered by FGN.GG.
// ---------------------------------------------------------------------------

// Golden Path canonical ids, retrieved from the live FGN.GG API and recorded in
// docs/api/integration-guides/gg-simulation-activity-contract.md.
const GOLDEN_PATHS: { activity_id: string; challenge_id: string; label: string }[] = [
  { activity_id: "6ac1275d-6c8d-41c0-ad52-9f22bd13ea2e", challenge_id: "7ceee2be-1279-45a1-97eb-618db5d403d7", label: "Bulk Grain Hauling" },
  { activity_id: "086eefb4-bff0-4826-8543-22864689cd2e", challenge_id: "02481a75-383c-485a-bdff-f0a4dd2b9121", label: "Excavation and Trenching" },
  { activity_id: "19720a68-04bd-4dae-8f74-17e91d14d4b5", challenge_id: "c79a46d4-9aa6-43b2-914f-1f83419f2586", label: "Interior Surface Preparation and Painting" },
  { activity_id: "b12e6fe2-1758-4409-84ff-762cc66323f4", challenge_id: "7846317c-77b2-4dd4-a855-308cb659891a", label: "Preflight Aircraft Inspection" },
  { activity_id: "b6e90c9b-0c62-4232-ab04-a92064af191b", challenge_id: "f969023f-d69e-4323-a508-778c6a92e7fa", label: "Trailer Positioning and Dock Approach" },
];

async function ggFetch(payload: Record<string, unknown>) {
  const playUrl = Deno.env.get("FGN_PLAY_SUPABASE_URL");
  const ecosystemKey = Deno.env.get("ECOSYSTEM_API_KEY");
  if (!playUrl || !ecosystemKey) throw new Error("Play integration not configured");
  const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ecosystem-Key": ecosystemKey,
      "X-Ecosystem-App": "academy",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function testCanonicalIdentity(): Promise<Record<string, unknown>> {
  const start = performance.now();
  const checks: Record<string, unknown> = {};
  try {
    // 1. The activity list action is reachable and returns records.
    const list = await ggFetch({ action: "simulation-activities", limit: 200, page: 0 });
    const listData = Array.isArray(list.body?.data) ? list.body.data : [];
    checks.activity_list = list.ok && listData.length > 0
      ? { status: "pass", count: listData.length }
      : { status: "fail", error: `simulation-activities ${list.status}`, count: listData.length };

    // 2. Single-activity lookup resolves.
    const single = await ggFetch({ action: "simulation-activity", id: GOLDEN_PATHS[3].activity_id });
    const singleId = single.body?.data?.simulation_activity_id ?? single.body?.data?.id;
    checks.single_activity_lookup = single.ok && singleId === GOLDEN_PATHS[3].activity_id
      ? { status: "pass" }
      : { status: "fail", error: `simulation-activity ${single.status}` };

    // 3. All five Golden Path canonical ids are present in the live list.
    const liveIds = new Set(
      listData.map((a: Record<string, unknown>) => (a.simulation_activity_id ?? a.id) as string),
    );
    const missing = GOLDEN_PATHS.filter((g) => !liveIds.has(g.activity_id)).map((g) => g.label);
    checks.golden_path_ids = missing.length === 0
      ? { status: "pass", verified: GOLDEN_PATHS.length }
      : { status: "fail", missing };

    // 4. Challenge -> canonical activity relationship still holds on GG's side.
    const challenges = await ggFetch({ action: "challenges", limit: 500, page: 0, include_inactive: true });
    const arr: Record<string, unknown>[] = Array.isArray(challenges.body?.challenges)
      ? challenges.body.challenges
      : Array.isArray(challenges.body?.data) ? challenges.body.data : [];
    const byId = new Map(arr.map((c) => [c.id as string, c]));
    const broken = GOLDEN_PATHS.filter((g) => {
      const c = byId.get(g.challenge_id) as Record<string, unknown> | undefined;
      return !c || c.simulation_activity_id !== g.activity_id;
    }).map((g) => g.label);
    checks.challenge_to_activity_relationship = broken.length === 0
      ? { status: "pass", verified: GOLDEN_PATHS.length }
      : { status: "fail", broken };

    const allPass = Object.values(checks)
      .every((c) => (c as { status: string }).status === "pass");
    return {
      status: allPass ? "pass" : "fail",
      latency_ms: Math.round(performance.now() - start),
      live_only: true,
      checks,
    };
  } catch (err) {
    return {
      status: "fail",
      latency_ms: Math.round(performance.now() - start),
      live_only: true,
      error: String(err),
      checks,
    };
  }
}
