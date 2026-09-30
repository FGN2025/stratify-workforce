// Per-program / per-source integration health.
// Admin-only (has_role admin). Read-only; no test data created.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTRACT_VERSION = "2026-10-01.2";

type HealthState = "not_connected" | "untested" | "healthy" | "degraded" | "failed";
// A program/source is never "healthy" without at least one real success.
function computeState(opts: { connected: boolean; lastSuccess: string | null; failures: number; dead: number; backlog: number; queryError: boolean }): HealthState {
  if (opts.queryError) return "failed";
  if (!opts.connected) return "not_connected";
  if (!opts.lastSuccess) return opts.failures + opts.dead > 0 ? "failed" : "untested";
  if (opts.dead > 0 || opts.failures > 0 || opts.backlog > 0) return "degraded";
  return "healthy";
}

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
    const authed = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authed.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await authed.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for cross-tenant operational reads.
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [sourcesRes, attemptsRes, replayRes, programsRes, gamesRes, woRes, completionsRes, outboundRes] = await Promise.all([
      admin.from("learning_sources").select("slug, display_name, is_active, strict_mode, shadow_mode, ingestion_mode, hmac_secret_env_name"),
      admin.from("learning_source_pull_attempts").select("source_slug, status, created_at").gte("created_at", sevenDaysAgo),
      admin.from("play_replay_queue").select("source_slug, status"),
      admin.from("programs").select("id, key, name, availability"),
      admin.from("program_games").select("program_id, game_title"),
      admin.from("work_orders").select("id, game_title, is_active"),
      admin.from("user_work_order_completions").select("id, work_order_id"),
      admin.from("play_outbound_queue").select("payload, status, created_at, completed_at"),
    ]);
    const queryErrors: Record<string, string> = {};
    for (const [k, r] of Object.entries({ attemptsRes, replayRes, gamesRes, woRes, completionsRes, outboundRes })) {
      if ((r as { error: { message: string } | null }).error) queryErrors[k] = (r as { error: { message: string } }).error.message;
    }
    const hasSecret = (name: string | null) => !!(name && Deno.env.get(name));

    if (sourcesRes.error || programsRes.error) {
      return new Response(
        JSON.stringify({ error: sourcesRes.error?.message ?? programsRes.error?.message ?? "query failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Per learning source ----
    const sources = (sourcesRes.data ?? []).map((s) => {
      const attempts = (attemptsRes.data ?? []).filter((a) => a.source_slug === s.slug);
      const succeeded = attempts.filter((a) => a.status === "success" || a.status === "completed");
      const failures = attempts.filter((a) => a.status === "failed" || a.status === "error");
      const backlog = (replayRes.data ?? []).filter(
        (r) => r.source_slug === s.slug && !["completed", "failed", "duplicate"].includes(r.status ?? ""),
      ).length;
      const lastSuccess = succeeded
        .map((a) => a.created_at)
        .sort()
        .at(-1) ?? null;
      return {
        slug: s.slug,
        display_name: s.display_name,
        is_active: s.is_active,
        strict_mode: s.strict_mode,
        shadow_mode: s.shadow_mode,
        last_success_at: lastSuccess,
        failures_7d: failures.length,
        retry_backlog: backlog,
        // Receiver-specific signing: outcomes require a verified signature.
        signing: !s.hmac_secret_env_name ? "no_secret_registered" : hasSecret(s.hmac_secret_env_name) ? (s.strict_mode ? "strict" : "verified_or_record_only") : "secret_missing",
        dead_or_failed_replays: (replayRes.data ?? []).filter((r) => r.source_slug === s.slug && r.status === "failed").length,
        state: computeState({
          connected: s.is_active && s.ingestion_mode === "push",
          lastSuccess,
          failures: failures.length,
          dead: (replayRes.data ?? []).filter((r) => r.source_slug === s.slug && r.status === "failed").length,
          backlog,
          queryError: !!(queryErrors.attemptsRes || queryErrors.replayRes),
        }),
      };
    });

    // ---- Per program ----
    const activeWoByGame = new Map<string, number>();
    for (const wo of woRes.data ?? []) {
      if (!wo.is_active) continue;
      activeWoByGame.set(wo.game_title, (activeWoByGame.get(wo.game_title) ?? 0) + 1);
    }
    const woIdByGame = new Map<string, string[]>();
    for (const wo of woRes.data ?? []) {
      if (!wo.is_active) continue;
      woIdByGame.set(wo.game_title, [...(woIdByGame.get(wo.game_title) ?? []), wo.id]);
    }
    // completion id -> work order id, so outbound queue payloads map to programs
    const completionToWo = new Map<string, string>();
    for (const c of completionsRes.data ?? []) {
      completionToWo.set(c.id, c.work_order_id);
    }
    const outboundRows = (outboundRes.data ?? []);

    const programs = (programsRes.data ?? []).map((p) => {
      const games = (gamesRes.data ?? []).filter((g) => g.program_id === p.id).map((g) => g.game_title);
      const woCount = games.reduce((n, g) => n + (activeWoByGame.get(g) ?? 0), 0);
      const gameWoIds = new Set(games.flatMap((g) => woIdByGame.get(g) ?? []));
      const programOutbound = outboundRows.filter((o) => {
        const cid = o.payload?.completion_id;
        // Task events carry work_order_id directly (no completion id).
        const woId = (cid ? completionToWo.get(cid) : undefined) ?? o.payload?.work_order_id;
        return woId && gameWoIds.has(woId);
      });
      const backlog = programOutbound.filter(
        (o) => !["completed", "failed", "duplicate"].includes(o.status ?? ""),
      ).length;
      const lastSuccess = programOutbound
        .filter((o) => o.status === "completed")
        .map((o) => o.completed_at ?? o.created_at)
        .sort()
        .at(-1) ?? null;
      return {
        key: p.key,
        name: p.name,
        availability: p.availability,
        work_orders: woCount,
        outbound_backlog: backlog,
        last_outbound_success_at: lastSuccess,
        failed_or_dead: programOutbound.filter((o) => ["failed", "dead"].includes(o.status ?? "")).length,
        state: computeState({
          connected: woCount > 0 && p.availability !== "coming_soon" && p.availability !== "hidden",
          lastSuccess,
          failures: 0,
          dead: programOutbound.filter((o) => ["failed", "dead"].includes(o.status ?? "")).length,
          backlog,
          queryError: !!(queryErrors.outboundRes || queryErrors.woRes || queryErrors.completionsRes || queryErrors.gamesRes),
        }),
      };
    });

    return new Response(
      JSON.stringify({
        contract_version: CONTRACT_VERSION,
        checked_at: new Date().toISOString(),
        sources,
        programs,
        query_errors: queryErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
