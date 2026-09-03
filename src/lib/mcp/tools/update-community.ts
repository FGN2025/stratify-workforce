import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_community",
  title: "Update community",
  description:
    "Update an existing community (tenant): name, description, branding, contact URLs or industries. Only fields you pass are changed. RLS restricts this to admins of that community.",
  inputSchema: {
    id: z.string().uuid().describe("Community (tenant) UUID."),
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    tagline: z.string().trim().optional(),
    brand_color: z.string().trim().optional(),
    accent_color: z.string().trim().optional(),
    logo_url: z.string().url().optional(),
    cover_image_url: z.string().url().optional(),
    website_url: z.string().url().optional(),
    support_email: z.string().email().optional(),
    location: z.string().trim().optional(),
    industries: z.array(z.string()).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const fields = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(fields).length === 0) {
      return { content: [{ type: "text", text: "No fields to update" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tenants")
      .update(fields)
      .eq("id", id)
      .select("id, name, slug, description, brand_color, industries")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "Community not found or not editable by this user." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { community: data },
    };
  },
});
