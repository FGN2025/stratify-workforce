import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const CATEGORY_TYPES = [
  "geography",
  "broadband_provider",
  "trade_skill",
  "school",
  "employer",
  "training_center",
  "government",
  "nonprofit",
  "community_organization",
  "club",
  "cte",
] as const;

export default defineTool({
  name: "create_community",
  title: "Create community",
  description:
    "Create a new community (tenant) on FGN Academy. Runs as the signed-in user, so it only succeeds for admins permitted to create communities.",
  inputSchema: {
    name: z.string().trim().min(2).describe("Display name of the community."),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only.")
      .describe("URL slug, e.g. 'north-valley-cte'."),
    description: z.string().trim().optional(),
    category_type: z.enum(CATEGORY_TYPES).optional(),
    brand_color: z.string().trim().optional().describe("Hex color, e.g. '#F59E0B'."),
    website_url: z.string().url().optional(),
    parent_tenant_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tenants")
      .insert({ ...input, owner_id: ctx.getUserId() })
      .select("id, name, slug, approval_status, category_type, parent_tenant_id")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { community: data },
    };
  },
});
