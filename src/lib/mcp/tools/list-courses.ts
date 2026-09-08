import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_courses",
  title: "List courses",
  description:
    "List courses visible to the signed-in user under RLS. Filter by tenant_id (community) to see one community's curriculum, e.g. Acme Broadband.",
  inputSchema: {
    tenant_id: z.string().uuid().optional().describe("Owning community UUID."),
    is_published: z.boolean().optional(),
    limit: z.number().int().positive().max(100).optional().describe("Max rows (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tenant_id, is_published, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("courses")
      .select(
        "id, title, description, game_title, difficulty_level, xp_reward, is_published, visibility, tenant_id, owner_tenant_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    if (is_published !== undefined) query = query.eq("is_published", is_published);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
