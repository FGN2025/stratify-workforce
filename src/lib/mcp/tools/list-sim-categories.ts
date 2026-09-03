import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_sim_categories",
  title: "List SIM categories",
  description:
    "List the industry categories (sim_categories) that group SIM games on FGN Academy. These drive the Work Orders filters and the sidebar.",
  inputSchema: {
    include_inactive: z.boolean().optional().describe("Include categories marked inactive."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_inactive }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("sim_categories")
      .select(
        "id, key, title, subtitle, icon_key, accent_color, default_game_titles, display_order, is_active, sidebar_label, show_in_sidebar",
      )
      .order("display_order", { ascending: true });
    if (!include_inactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { categories: data ?? [] },
    };
  },
});
