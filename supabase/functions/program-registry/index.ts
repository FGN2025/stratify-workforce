// Public, read-only program registry feed. Drives Academy's program directory
// and shared cross-vertical navigation. Anonymous reads go through this
// projection only; base tables are authenticated-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CONTRACT_VERSION = "2026-09-30.1";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  let q = supabase
    .from("programs")
    .select("key,name,short_name,kind,canonical_url,legacy_urls,tagline,logo_url,accent_color,availability,capabilities,is_academy_program,owner_contact,sort_order,updated_at,program_games(game_title),program_pathways(course_id,work_order_id,label,sort_order)")
    .in("availability", ["live", "preview", "coming_soon"])
    .order("sort_order");
  if (key) q = q.eq("key", key);
  const { data, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: "registry_unavailable" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const programs = (data ?? []).map((p: any) => ({
    ...p,
    games: (p.program_games ?? []).map((g: any) => g.game_title),
    pathways: (p.program_pathways ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    program_games: undefined,
    program_pathways: undefined,
  }));
  const version = programs.reduce((m: string, p: any) => (p.updated_at > m ? p.updated_at : m), "");
  if (key && programs.length === 0) {
    return new Response(JSON.stringify({ error: "not_found", contract_version: CONTRACT_VERSION }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ contract_version: CONTRACT_VERSION, registry_version: version, programs }), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});
