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

// Returns the full work_orders row (this project's "challenges" table) plus
// its child work_order_tasks. NOTE: work_order_tasks has no verification_type
// column on this project, so we return the columns that actually exist.
export default defineTool({
  name: "get_challenge",
  title: "Get challenge",
  description:
    "Return a single challenge (work_orders row) with its child tasks (work_order_tasks). RLS-scoped.",
  inputSchema: {
    id: z.string().uuid().describe("Challenge (work_order) UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [challengeRes, tasksRes] = await Promise.all([
      supabase.from("work_orders").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("work_order_tasks")
        .select("id, title, description, order_index, source_task_id")
        .eq("work_order_id", id)
        .order("order_index", { ascending: true }),
    ]);
    if (challengeRes.error) {
      return { content: [{ type: "text", text: challengeRes.error.message }], isError: true };
    }
    if (tasksRes.error) {
      return { content: [{ type: "text", text: tasksRes.error.message }], isError: true };
    }
    const payload = { challenge: challengeRes.data, tasks: tasksRes.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
