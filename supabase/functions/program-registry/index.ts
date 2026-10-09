// Public, read-only program registry feed. Drives Academy's program directory
// and shared cross-vertical navigation. Anonymous reads go through this
// projection only; base tables are authenticated-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// 2026-10-09.1: additive disciplines[] and applications[] (marketplace). programs[] unchanged.
const CONTRACT_VERSION = "2026-10-09.1";
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
  // Marketplace registry (additive). Hidden rows never leave the server.
  const [{ data: discRows }, { data: appRows, error: appErr }] = await Promise.all([
    supabase.from("disciplines").select("key,name,tagline,description,accent_color,status,featured,sort_order,updated_at")
      .neq("status", "hidden").order("sort_order"),
    supabase.from("applications")
      .select("key,name,short_name,tagline,description,launch_type,launch_url,in_academy_path,legacy_urls,status,access_terms,shared_services,accent_color,hero_image_url,featured,sort_order,updated_at,program:programs!applications_program_id_fkey(key,program_games(game_title)),application_disciplines(is_primary,discipline:disciplines(key,status))")
      .neq("status", "hidden").order("sort_order"),
  ]);
  const disciplines = discRows ?? [];
  if (appErr) console.error("applications query failed", appErr.message);
  const applications = (appRows ?? []).map((a: any) => ({
    ...a,
    program_key: a.program?.key ?? null,
    games: (a.program?.program_games ?? []).map((g: any) => g.game_title),
    disciplines: (a.application_disciplines ?? [])
      .filter((x: any) => x.discipline && x.discipline.status !== "hidden")
      .sort((x: any, y: any) => Number(y.is_primary) - Number(x.is_primary))
      .map((x: any) => x.discipline.key),
    program: undefined,
    application_disciplines: undefined,
  }));
  const version = [...programs, ...disciplines, ...applications].reduce((m: string, p: any) => (p.updated_at > m ? p.updated_at : m), "");
  if (key && programs.length === 0) {
    return new Response(JSON.stringify({ error: "not_found", contract_version: CONTRACT_VERSION }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ contract_version: CONTRACT_VERSION, registry_version: version, programs, disciplines, applications }), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});
