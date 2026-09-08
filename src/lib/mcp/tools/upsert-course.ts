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
  name: "upsert_course",
  title: "Create or update course",
  description:
    "Create a course for a community (pass tenant_id, e.g. Acme Broadband), or update one when `id` is supplied. Runs as the signed-in user, so RLS restricts writes to admins of the owning community.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Course UUID. Omit to create."),
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    game_title: z.enum(GAME_TITLES).optional(),
    difficulty_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    xp_reward: z.number().int().min(0).optional(),
    cover_image_url: z.string().url().optional(),
    tenant_id: z.string().uuid().optional().describe("Owning community; required when creating a community course."),
    visibility: z.enum(["public", "tenant", "private"]).optional(),
    is_published: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, ...input }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const fields: Record<string, unknown> = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(fields).length === 0) {
      return { content: [{ type: "text", text: "Nothing to write" }], isError: true };
    }
    if (fields.tenant_id && !fields.owner_tenant_id) fields.owner_tenant_id = fields.tenant_id;

    const supabase = supabaseForUser(ctx);
    const selection =
      "id, title, description, game_title, difficulty_level, xp_reward, is_published, visibility, tenant_id, owner_tenant_id";

    if (id) {
      const { data, error } = await supabase
        .from("courses")
        .update(fields)
        .eq("id", id)
        .select(selection)
        .maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!data) {
        return {
          content: [{ type: "text", text: "Course not found or not editable by this user." }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { course: data } };
    }

    if (!fields.title) {
      return { content: [{ type: "text", text: "title is required when creating a course." }], isError: true };
    }
    const { data, error } = await supabase
      .from("courses")
      .insert(fields as any)
      .select(selection)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { course: data } };
  },
});
