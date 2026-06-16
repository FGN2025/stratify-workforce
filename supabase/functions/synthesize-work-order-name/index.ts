// supabase/functions/synthesize-work-order-name/index.ts
// Implements docs/work-order-name-contract.md.
// Synthesizes a short, trade-framed, neutral-language display name for a
// work order. Returns the candidate; the admin reviews/edits/persists
// separately via a normal work_orders UPDATE.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getTradeContext } from "../_shared/trade-context.ts";
import { NEUTRAL_LANGUAGE_RULES, findBannedTerms } from "../_shared/neutral-language.ts";

const SYSTEM_PROMPT = `You write short display names for work orders that describe real-world industrial and trade work.

Each work order represents a real job. Translate its metadata into a concise, trade-framed name suitable as a card heading and page heading on a learning platform.

${NEUTRAL_LANGUAGE_RULES}

HARD RULES (non-negotiable):

1. Length: 3 to 8 words. Title Case. No trailing punctuation. No quotes. No emoji. No markdown.

2. Trade-framed: name the real-world work (e.g. "Build a Pitched Asphalt-Shingle Roof", "Long-Haul Refrigerated Delivery to Phoenix"). NEVER name the sim, game, archetype, or platform mechanic.

3. Specific over generic. Prefer the concrete job ("Replace a Fiber Drop at a Service Pedestal") over the abstract category ("Fiber Work").

4. Do not echo banned terms even if they appear in the input title or description. Rewrite them.

OUTPUT: only the name. Nothing else. No preface, no explanation.`;

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
    const { work_order_id, admin_steer } = body as {
      work_order_id?: string;
      admin_steer?: string;
    };
    if (!work_order_id || typeof work_order_id !== "string") {
      return json({ code: "validation", field: "work_order_id", message: "required" }, 400);
    }

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

    const playSource = (wo.metadata as { play_source?: Record<string, unknown> } | null)?.play_source;
    const playSourceName =
      typeof playSource?.name === "string" ? (playSource.name as string).trim() : null;
    const playSourceBlurb =
      typeof playSource?.description === "string" ? (playSource.description as string).trim() : null;

    const trade = getTradeContext(wo.game_title as string | null);

    const userParts: string[] = [
      `TRADE CONTEXT: ${trade}`,
      `CURRENT TITLE (if any, may be empty): ${wo.title ?? ""}`,
    ];
    if (playSourceName) userParts.push(`SOURCE CHALLENGE NAME: ${playSourceName}`);
    if (wo.description) userParts.push(`DESCRIPTION: ${wo.description}`);
    if (playSourceBlurb) userParts.push(`SOURCE BLURB: ${playSourceBlurb}`);
    if (wo.category_key) userParts.push(`CATEGORY: ${wo.category_key}`);
    if (wo.difficulty) userParts.push(`DIFFICULTY: ${wo.difficulty}`);
    if (admin_steer && typeof admin_steer === "string" && admin_steer.trim()) {
      userParts.push(`ADMIN GUIDANCE: ${admin_steer.trim()}`);
    }
    const userMsg = userParts.join("\n");

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) return json({ code: "internal", message: "Missing LOVABLE_API_KEY" }, 500);

    const gwResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": aiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!gwResp.ok) {
      const text = await gwResp.text().catch(() => "");
      return json(
        { code: "gateway", status: gwResp.status, message: text || gwResp.statusText },
        gwResp.status >= 500 ? 502 : 400,
      );
    }

    const payload = await gwResp.json();
    let candidate: string = payload?.choices?.[0]?.message?.content?.toString().trim() ?? "";
    if (!candidate) {
      return json({ code: "internal", message: "Empty name from model" }, 502);
    }

    // Light cleanup: strip surrounding quotes/markdown, trailing punctuation.
    candidate = candidate
      .replace(/^["'`*_]+|["'`*_]+$/g, "")
      .replace(/[.!?,;:]+$/, "")
      .trim();

    const hits = findBannedTerms(candidate);
    if (hits.length > 0) {
      return json(
        {
          code: "validation",
          field: "output",
          message: `Generated name contains banned terms: ${hits.join(", ")}. Regenerate or edit.`,
          generated_name: candidate,
          banned_hits: hits,
        },
        422,
      );
    }

    const wordCount = candidate.split(/\s+/).filter(Boolean).length;
    if (wordCount < 2 || wordCount > 12) {
      return json(
        {
          code: "validation",
          field: "output",
          message: `Generated name has ${wordCount} words; expected 3–8. Regenerate or edit.`,
          generated_name: candidate,
        },
        422,
      );
    }

    return json({ generated_name: candidate }, 200);
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
