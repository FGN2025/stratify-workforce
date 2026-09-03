import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const GAME_TITLES = [
  "ATS",
  "Farming_Sim",
  "Construction_Sim",
  "Mechanic_Sim",
  "Fiber_Tech",
  "Roadcraft",
  "MSFS_2024",
  "House_Flipper",
  "House_Flipper_2",
  "Electrician_Sim",
] as const;

export default defineTool({
  name: "upsert_sim_category",
  title: "Create or update SIM category",
  description:
    "Create or update an industry category (sim_categories) by its unique `key`. Categories name the Work Orders filters and the sidebar entries, and map to one or more SIM games.",
  inputSchema: {
    key: z.string().trim().min(2).describe("Stable unique key, e.g. 'trucking-logistics'."),
    title: z.string().trim().min(2).describe("Industry filter name, e.g. 'Trucking & Logistics'."),
    subtitle: z.string().trim().optional(),
    icon_key: z.string().trim().optional().describe("Icon key from the app's SIM icon set."),
    accent_color: z.string().trim().optional().describe("Hex color, e.g. '#F59E0B'."),
    default_game_titles: z.array(z.enum(GAME_TITLES)).optional().describe("SIM games in this industry."),
    display_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    sidebar_label: z.string().trim().optional().describe("Sidebar label when it differs from the filter name."),
    show_in_sidebar: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const row = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sim_categories")
      .upsert(row, { onConflict: "key" })
      .select(
        "id, key, title, subtitle, icon_key, accent_color, default_game_titles, display_order, is_active, sidebar_label, show_in_sidebar",
      )
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { category: data },
    };
  },
});
