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

// NOTE: On this project "challenges" are stored in the work_orders table.
// The filter parameter is `game_title` (an enum string like "Fiber_Tech"),
// NOT `game_id`. This is a deliberate asymmetry with the play.fgn.gg
// connector where game_id is a real uuid — the two projects have different
// schemas and their MCP tools reflect that.
export default defineTool({
  name: "list_challenges",
  title: "List challenges",
  description:
    "List challenges (work_orders) visible to the caller under RLS. Filter by game_title (enum string, e.g. 'Fiber_Tech'), tenant_id, or is_active.",
  inputSchema: {
    game_title: z.string().optional().describe("Game enum name (e.g. 'Fiber_Tech'). This project has no separate games UUID."),
    tenant_id: z.string().uuid().optional(),
    is_active: z.boolean().optional(),
    limit: z.number().int().positive().max(100).optional().describe("Max rows (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ game_title, tenant_id, is_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("work_orders")
      .select("id, title, generated_name, game_title, is_active, difficulty, xp_reward, tenant_id, fgn_origin_challenge_id, source_challenge_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (game_title !== undefined) q = q.eq("game_title", game_title);
    if (tenant_id !== undefined) q = q.eq("tenant_id", tenant_id);
    if (is_active !== undefined) q = q.eq("is_active", is_active);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { challenges: data ?? [] },
    };
  },
});
