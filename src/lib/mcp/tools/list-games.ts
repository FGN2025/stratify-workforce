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

export default defineTool({
  name: "list_games",
  title: "List games",
  description:
    "List the games catalog. On this project the catalog is keyed by the game_title enum (returned as `id`); there is no separate games table with UUID ids.",
  inputSchema: {
    limit: z.number().int().positive().max(100).optional().describe("Max rows to return (default 50, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("game_channels")
      .select("game_title, name, description, accent_color, cover_image_url, member_count, work_order_count")
      .order("name", { ascending: true })
      .limit(limit ?? 50);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const games = (data ?? []).map((g: Record<string, unknown>) => ({
      id: g.game_title,
      name: g.name,
      description: g.description,
      accent_color: g.accent_color,
      cover_image_url: g.cover_image_url,
      member_count: g.member_count,
      work_order_count: g.work_order_count,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(games) }],
      structuredContent: { games },
    };
  },
});
