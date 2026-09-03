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
  name: "upsert_work_order",
  title: "Create or update work order",
  description:
    "Create a work order (challenge), or update one when `id` is supplied. `game_title` is required on create. Runs as the signed-in user, so RLS restricts writes to admins of the owning community.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Work order UUID. Omit to create a new one."),
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    game_title: z.enum(GAME_TITLES).optional().describe("Required when creating."),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    xp_reward: z.number().int().min(0).optional(),
    estimated_time_minutes: z.number().int().positive().optional(),
    category_key: z.string().trim().optional().describe("Industry category key from list_sim_categories."),
    tenant_id: z.string().uuid().optional().describe("Owning community; omit for the global catalog."),
    cover_image_url: z.string().url().optional(),
    is_active: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, ...input }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const fields = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (Object.keys(fields).length === 0) {
      return { content: [{ type: "text", text: "Nothing to write" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const selection =
      "id, title, description, game_title, difficulty, xp_reward, category_key, tenant_id, is_active, created_at";

    if (id) {
      const { data, error } = await supabase
        .from("work_orders")
        .update(fields)
        .eq("id", id)
        .select(selection)
        .maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!data) {
        return {
          content: [{ type: "text", text: "Work order not found or not editable by this user." }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
        structuredContent: { work_order: data },
      };
    }

    if (!fields.game_title) {
      return { content: [{ type: "text", text: "game_title is required when creating a work order." }], isError: true };
    }
    const { data, error } = await supabase
      .from("work_orders")
      .insert(fields)
      .select(selection)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { work_order: data },
    };
  },
});
