// supabase/functions/generate-cover-image/index.ts
// Implements docs/cover-prompt-contract.md §2.2 + §6 + §7 + §8 + §9 (v1.1: crop-to-16:9).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PNG } from "npm:pngjs@7";
import { Buffer } from "node:buffer";

const STYLE_WRAPPER = `. Style: cinematic 16:9 cover banner, photoreal, dramatic natural lighting, shallow depth of field, industrial color palette (deep blues, warm ambers, weathered metal, concrete, dust in light). Wide composition with strong negative space on one side suitable for an overlay. Any people present appear as workers in context with faces not clearly identifiable (turned away, in profile, distant, partially obscured by safety gear, or framed below the shoulders). No text, no typography, no logos, no watermarks, no UI overlays, no game HUD elements.`;

const TARGET_RATIO = 16 / 9;
const MIN_CROPPED_WIDTH = 1024;
const MIN_CROPPED_HEIGHT = 576;
const IMAGE_SIZE = "1792x1024";
const BUCKET = "media-assets";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ code: "unauthorized" }, 401);

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
    const { work_order_id, prompt } = body as { work_order_id?: string; prompt?: string };
    if (!work_order_id || typeof work_order_id !== "string") {
      return json({ code: "validation", field: "work_order_id", message: "required" }, 400);
    }
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return json({ code: "validation", field: "prompt", message: "required non-empty" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Confirm work order exists.
    const { data: wo } = await admin
      .from("work_orders")
      .select("id")
      .eq("id", work_order_id)
      .maybeSingle();
    if (!wo) return json({ code: "not_found", entity: "work_order" }, 404);

    // Read image model from settings.
    const { data: settingRow } = await admin
      .from("ai_platform_settings")
      .select("value")
      .eq("key", "cover_image_model")
      .maybeSingle();
    const model = (settingRow?.value as string | null) ?? "google/gemini-3.1-flash-image-preview";

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) return json({ code: "internal", message: "Missing LOVABLE_API_KEY" }, 500);

    const finalPrompt = `${prompt.trim()}\n\n${STYLE_WRAPPER}`;

    // Build body per model family (contract §7).
    const isGemini = model.startsWith("google/");
    const reqBody = isGemini
      ? {
          model,
          messages: [{ role: "user", content: finalPrompt }],
          modalities: ["image", "text"],
        }
      : {
          model,
          prompt: finalPrompt,
          size: IMAGE_SIZE,
          n: 1,
        };

    const gwResp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": aiKey,
      },
      body: JSON.stringify(reqBody),
    });

    if (!gwResp.ok) {
      const text = await gwResp.text().catch(() => "");
      const code = text.toLowerCase().includes("moderation") || text.toLowerCase().includes("policy")
        ? "moderation"
        : "gateway";
      return json({ code, status: gwResp.status, message: text || gwResp.statusText }, gwResp.status >= 500 ? 502 : 400);
    }

    const payload = await gwResp.json();
    const b64: string | undefined = payload?.data?.[0]?.b64_json;
    if (!b64) return json({ code: "internal", message: "No image data returned" }, 502);

    // Decode + measure ratio.
    const bytes = base64ToBytes(b64);
    const dims = readPngDimensions(bytes);
    if (!dims) return json({ code: "internal", message: "Could not parse PNG dimensions" }, 502);
    const actual = dims.width / dims.height;
    const diff = Math.abs(actual - TARGET_RATIO) / TARGET_RATIO;
    if (diff > RATIO_TOLERANCE) {
      return json({ code: "off_ratio", actual_ratio: actual, target_ratio: TARGET_RATIO }, 422);
    }

    // Upload.
    const ts = Date.now();
    const path = `work-orders/${work_order_id}/cover-${ts}.png`;
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadErr) return json({ code: "storage", message: uploadErr.message }, 500);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const cover_image_url = pub.publicUrl;

    // Persist.
    const cover_image_prompt = prompt.trim(); // stored WITHOUT wrapper per contract §9
    const { error: updErr } = await admin
      .from("work_orders")
      .update({ cover_image_url, cover_image_prompt })
      .eq("id", work_order_id);
    if (updErr) return json({ code: "internal", message: updErr.message }, 500);

    return json({ cover_image_url, cover_image_prompt }, 200);
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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// PNG IHDR: 8-byte signature, then 4-byte length, "IHDR", then width (4 BE), height (4 BE).
function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  // Signature check
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null;
  // IHDR starts at byte 8: 4 length + "IHDR" (12,13,14,15) + width@16-19 + height@20-23
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) return null;
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (!width || !height) return null;
  return { width, height };
}
