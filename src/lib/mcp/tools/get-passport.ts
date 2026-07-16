import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

declare const Deno: { env: { get(key: string): string | undefined } };

function supabaseForUser(ctx: ToolContext) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Compose the passport from real tables only. Do NOT fabricate readiness data.
//
// SECURITY: calculate_readiness() is SECURITY DEFINER and bypasses RLS, so
// gating it on the caller-scoped profile read is what stops an authenticated
// user from pulling readiness for anyone else. If the profile RLS-read
// returns no row, we skip the RPC and return readiness: null.
export default defineTool({
  name: "get_passport",
  title: "Get passport",
  description:
    "Return a user's skill passport: profile, passport record, earned credentials, badges, and career readiness (only for users the caller can read under RLS).",
  inputSchema: {
    user_id: z.string().uuid().optional().describe("Target user. Defaults to the signed-in caller. Other users only returned when RLS permits."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ user_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const targetUserId = user_id ?? ctx.getUserId();
    const supabase = supabaseForUser(ctx);

    // Step 1: RLS-gated profile read. Empty => caller may not read this user.
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, employability_score, skills, tenant_id, created_at, updated_at")
      .eq("id", targetUserId)
      .maybeSingle();
    if (profileErr) {
      return { content: [{ type: "text", text: profileErr.message }], isError: true };
    }
    if (!profile) {
      const empty = { profile: null, passport: null, credentials: [], badges: [], readiness: null };
      return {
        content: [{ type: "text", text: JSON.stringify(empty) }],
        structuredContent: empty,
      };
    }

    // Step 2: pull passport + related data in parallel.
    const [passportRes, badgesRes] = await Promise.all([
      supabase
        .from("skill_passport")
        .select("id, passport_hash, public_url_slug, is_public, created_at, updated_at")
        .eq("user_id", targetUserId)
        .maybeSingle(),
      supabase
        .from("user_badges")
        .select("earned_at, badge:badges(id, name, description, icon_name, game_title, category, accent_color)")
        .eq("user_id", targetUserId),
    ]);

    let credentials: unknown[] = [];
    if (passportRes.data?.id) {
      const { data: creds } = await supabase
        .from("skill_credentials")
        .select("id, credential_type, credential_type_key, title, issuer, issued_at, expires_at, skills_verified, score, game_title, xp_earned, source")
        .eq("passport_id", passportRes.data.id)
        .order("issued_at", { ascending: false });
      credentials = creds ?? [];
    }

    // Step 3: only NOW call the SECURITY DEFINER readiness RPC — the profile
    // read above confirmed the caller may see this user.
    const { data: readiness } = await supabase.rpc("calculate_readiness", { p_user_id: targetUserId });

    const payload = {
      profile,
      passport: passportRes.data ?? null,
      credentials,
      badges: badgesRes.data ?? [],
      readiness: readiness ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
