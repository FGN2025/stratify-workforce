// supabase/functions/synthesize-cover-prompt/index.ts
// Implements docs/cover-prompt-contract.md §2.1 + §3 + §4 + §5.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TRADE_CONTEXT: Record<string, string> = {
  American_Truck_Simulator: "long-haul trucking on American highways",
  Euro_Truck_Simulator_2: "long-haul trucking through European cities",
  Farming_Simulator_25: "row-crop and livestock farming",
  Farming_Simulator_22: "row-crop and livestock farming",
  Construction_Simulator: "heavy commercial construction",
  Car_Mechanic_Simulator_2021: "automotive repair in a professional garage",
  Roadcraft: "heavy civil roadworks and infrastructure",
  Fiber_Tech: "outside-plant fiber-optic network construction",
  House_Flipper: "residential renovation and restoration",
  House_Flipper_2: "residential renovation and restoration",
  Microsoft_Flight_Simulator_2024: "commercial and general aviation operations",
  MSFS_2024: "commercial and general aviation operations",
};

const SYSTEM_PROMPT = `You write single-paragraph image prompts for cinematic 16:9 cover banners that depict real-world industrial and trade work.

You will be given a work order's metadata. Translate it into a vivid, concrete scene description suitable for an image model.

HARD RULES — these are non-negotiable:

1. Describe the real-world scene and the work generically. NEVER echo platform-internal jargon, sim/game vocabulary, or archetype labels, even if those words appear in the input. Banned terms include but are not limited to: "load out", "loadout", "plan the route", "sim", "simulator", "in-game", "gameplay", "challenge", "work order", "mission", "objective", "tutorial", "spatial task", "sequence task", "loadout task", "debrief", "deploy", "spawn".

2. Translate work-order vocabulary into scene vocabulary:
   - "loadout" → describe the actual tools/equipment in the scene
   - "plan the route" → describe the actual movement or location
   - "challenge / work order" → describe the work being done
   - Sim/game names → the underlying trade (e.g. "house renovation", "long-haul trucking", "commercial aviation", "row-crop farming")

3. People may appear in the scene as workers, but faces must not be clearly identifiable. Acceptable: face turned away, in profile, distant, partially obscured by safety gear, in shadow, or framed below the shoulders. Empty scenes are also acceptable.

4. Single paragraph. No markdown. No lists. No headings. No quotes around the prompt. <= 1200 characters total.

5. Concrete, photoreal, cinematic. Specific time of day, lighting, weather, materials, tools, vantage point. Industrial palette.

6. Do not mention aspect ratio, resolution, or camera specs — those are handled by the style wrapper appended downstream. Do not include the words "16:9", "cinematic", or "photoreal" in your output; the wrapper adds those.

OUTPUT: only the prompt paragraph. Nothing else.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ code: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ code: "unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ code: "unauthorized" }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ code: "validation", field: "body", message: "JSON body required" }, 400);
    }
    const { work_order_id, admin_steer } = body as { work_order_id?: string; admin_steer?: string };
    if (!work_order_id || typeof work_order_id !== "string") {
      return json({ code: "validation", field: "work_order_id", message: "required" }, 400);
    }

    // Service-role client to read the work order (RLS bypass for admin-validated request).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: wo, error: woErr } = await admin
      .from("work_orders")
      .select("title, description, game_title, category_key, difficulty, metadata")
      .eq("id", work_order_id)
      .maybeSingle();
    if (woErr) return json({ code: "internal", message: woErr.message }, 500);
    if (!wo) return json({ code: "not_found", entity: "work_order" }, 404);

    const playSource = (wo.metadata as any)?.play_source;
    const playSourceBlurb: string | null =
      typeof playSource?.description === "string" ? playSource.description :
      typeof playSource?.blurb === "string" ? playSource.blurb :
      typeof playSource?.summary === "string" ? playSource.summary :
      null;

    const trade = TRADE_CONTEXT[wo.game_title as string] ?? "industrial trade work";

    const userParts: string[] = [
      `TRADE CONTEXT: ${trade}`,
      `TITLE: ${wo.title ?? ""}`,
    ];
    if (wo.description) userParts.push(`DESCRIPTION: ${wo.description}`);
    if (wo.category_key) userParts.push(`CATEGORY: ${wo.category_key}`);
    if (wo.difficulty) userParts.push(`DIFFICULTY: ${wo.difficulty}`);
    if (playSourceBlurb) userParts.push(`SCENE REFERENCE (preferred): ${playSourceBlurb}`);
    if (admin_steer && typeof admin_steer === "string" && admin_steer.trim()) {
      userParts.push(`ADMIN GUIDANCE: ${admin_steer.trim()}`);
    }
    const userMsg = userParts.join("\n");

    // Read model from ai_platform_settings (default fallback per contract §7).
    const { data: settingRow } = await admin
      .from("ai_platform_settings")
      .select("value")
      .eq("key", "cover_prompt_model")
      .maybeSingle();
    const model = (settingRow?.value as string | null) ?? "google/gemini-3-flash-preview";

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) return json({ code: "internal", message: "Missing LOVABLE_API_KEY" }, 500);

    const gwResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": aiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!gwResp.ok) {
      const text = await gwResp.text().catch(() => "");
      return json({ code: "gateway", status: gwResp.status, message: text || gwResp.statusText }, gwResp.status >= 500 ? 502 : 400);
    }

    const payload = await gwResp.json();
    const prompt: string = payload?.choices?.[0]?.message?.content?.toString().trim() ?? "";
    if (!prompt) return json({ code: "internal", message: "Empty prompt from model" }, 502);

    return json({ prompt }, 200);
  } catch (e) {
    return json({ code: "internal", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
