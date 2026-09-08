import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const questionSchema = z.object({
  id: z.string().trim().min(1).optional().describe("Stable question id; generated when omitted."),
  prompt: z.string().trim().min(2),
  options: z.array(z.string().trim().min(1)).min(2).max(8),
  correct_index: z.number().int().min(0).describe("Zero-based index of the correct option."),
  explanation: z.string().trim().optional(),
});

export default defineTool({
  name: "upsert_lesson",
  title: "Create or update lesson or quiz",
  description:
    "Create a lesson (or quiz) inside a course, or update one when `id` is supplied. Each lesson gets its own module, matching the platform's 1:1 curriculum structure. For quizzes pass `lesson_type: 'quiz'` and `questions`. Runs as the signed-in user, so RLS restricts writes to admins of the owning community.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Lesson UUID. Omit to create."),
    course_id: z.string().uuid().optional().describe("Course to add the lesson to. Required when creating."),
    title: z.string().trim().min(2).optional(),
    lesson_type: z.enum(["video", "reading", "quiz", "simulation", "work_order"]).optional(),
    xp_reward: z.number().int().min(0).optional(),
    passing_score: z.number().int().min(0).max(100).optional().describe("Percent needed to pass a quiz."),
    order_index: z.number().int().min(0).optional(),
    work_order_id: z.string().uuid().optional().describe("Link the lesson to a work order (challenge)."),
    frame: z.string().trim().optional().describe("Framing text shown before the activity."),
    play: z.string().trim().optional().describe("Instructions for the hands-on step."),
    prove: z.string().trim().optional().describe("What the learner must demonstrate."),
    questions: z.array(questionSchema).optional().describe("Quiz questions; replaces existing questions."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, course_id, frame, play, prove, questions, ...input }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const selection =
      "id, module_id, title, lesson_type, order_index, xp_reward, passing_score, work_order_id, content";

    const buildContent = (existing: any) => {
      const content: Record<string, unknown> = { ...(existing ?? {}) };
      if (frame !== undefined) content.frame = frame;
      if (play !== undefined) content.play = play;
      if (prove !== undefined) content.prove = prove;
      if (frame !== undefined || play !== undefined || prove !== undefined) content.tier = "light";
      if (questions !== undefined) {
        content.questions = questions.map((q, i) => ({
          id: q.id ?? `q${i + 1}`,
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
          ...(q.explanation ? { explanation: q.explanation } : {}),
        }));
      }
      return Object.keys(content).length ? content : null;
    };

    const fields: Record<string, unknown> = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    );

    if (id) {
      const { data: existing, error: readErr } = await supabase
        .from("lessons")
        .select("content")
        .eq("id", id)
        .maybeSingle();
      if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
      if (!existing) {
        return { content: [{ type: "text", text: "Lesson not found or not visible to this user." }], isError: true };
      }
      const content = buildContent(existing.content);
      if (content) fields.content = content;
      if (Object.keys(fields).length === 0) {
        return { content: [{ type: "text", text: "Nothing to write" }], isError: true };
      }
      const { data, error } = await supabase
        .from("lessons")
        .update(fields)
        .eq("id", id)
        .select(selection)
        .maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!data) {
        return { content: [{ type: "text", text: "Lesson not editable by this user." }], isError: true };
      }
      return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { lesson: data } };
    }

    if (!course_id || !fields.title) {
      return {
        content: [{ type: "text", text: "course_id and title are required when creating a lesson." }],
        isError: true,
      };
    }

    // One module per lesson (1:1 curriculum structure).
    const { count } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course_id);
    const orderIndex = (fields.order_index as number | undefined) ?? count ?? 0;

    const { data: moduleRow, error: moduleErr } = await supabase
      .from("modules")
      .insert({
        course_id,
        title: fields.title as string,
        order_index: orderIndex,
        xp_reward: (fields.xp_reward as number | undefined) ?? 0,
      })
      .select("id")
      .maybeSingle();
    if (moduleErr) return { content: [{ type: "text", text: moduleErr.message }], isError: true };
    if (!moduleRow) {
      return {
        content: [{ type: "text", text: "Could not create the module for this lesson (check admin permissions)." }],
        isError: true,
      };
    }

    const content = buildContent(null);
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        ...(fields as any),
        module_id: moduleRow.id,
        order_index: 0,
        ...(content ? { content } : {}),
      })
      .select(selection)
      .maybeSingle();
    if (error) {
      await supabase.from("modules").delete().eq("id", moduleRow.id);
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { lesson: data } };
  },
});
