import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

declare const Deno: { env: { get(key: string): string | undefined } };

function supabaseForUser(ctx: ToolContext) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_communities",
  title: "List my communities",
  description:
    "List the communities (tenants) the signed-in FGN Academy user is a member of.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    // Tenant membership lives in community_memberships (there is no tenant_users
    // table on this project). Only approved memberships count.
    const { data, error } = await supabase
      .from("community_memberships")
      .select("role, joined_at, tenant:tenants(id, name, slug, logo_url, accent_color, brand_color)")
      .eq("user_id", ctx.getUserId())
      .eq("request_status", "approved");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    type Row = { role: string | null; tenant: { id: string; name: string; slug: string; logo_url: string | null; accent_color: string | null; brand_color: string | null } | null };
    const memberships = ((data ?? []) as unknown as Row[])
      .filter((r) => r.tenant)
      .map((r) => ({
        tenant_id: r.tenant!.id,
        name: r.tenant!.name,
        slug: r.tenant!.slug,
        logo_url: r.tenant!.logo_url,
        accent_color: r.tenant!.accent_color,
        brand_color: r.tenant!.brand_color,
        role: r.role,
      }));
    return {
      content: [{ type: "text", text: JSON.stringify(memberships) }],
      structuredContent: { memberships },
    };
  },
});
