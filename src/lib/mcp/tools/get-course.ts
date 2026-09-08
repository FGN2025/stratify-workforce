import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_course",
  title: "Get course",
  description:
    "Return one course with its modules and lessons (including quiz question counts). RLS-scoped to the signed-in user.",
  inputSchema: { id: z.string().uuid().describe("Course UUID.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: course, error } = await supabase
      .from("courses")
      .select(
        "id, title, description, game_title, difficulty_level, xp_reward, is_published, visibility, tenant_id, owner_tenant_id",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!course) return { content: [{ type: "text", text: "Course not found" }], isError: true };

    const { data: modules } = await supabase
      .from("modules")
      .select("id, title, description, order_index, xp_reward")
      .eq("course_id", id)
      .order("order_index");

    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = moduleIds.length
      ? await supabase
          .from("lessons")
          .select("id, module_id, title, lesson_type, order_index, xp_reward, passing_score, work_order_id, content")
          .in("module_id", moduleIds)
          .order("order_index")
      : { data: [] as any[] };

    const shaped = (modules ?? []).map((m) => ({
      ...m,
      lessons: (lessons ?? [])
        .filter((l: any) => l.module_id === m.id)
        .map((l: any) => ({
          ...l,
          question_count: Array.isArray(l.content?.questions) ? l.content.questions.length : 0,
        })),
    }));

    const payload = { course, modules: shaped };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
