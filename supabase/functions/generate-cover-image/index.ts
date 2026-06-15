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

    // Decode PNG fully (pixels + metadata).
    const rawBytes = base64ToBytes(b64);
    let decoded: PNG;
    try {
      decoded = PNG.sync.read(Buffer.from(rawBytes));
    } catch (e) {
      return json({ code: "internal", message: `PNG decode failed: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }
    const rawWidth = decoded.width;
    const rawHeight = decoded.height;
    const rawRatio = rawWidth / rawHeight;

    // Center-crop to 16:9 (contract v1.1).
    const crop = centerCropTo16x9(decoded);
    if (!crop.ok) {
      console.warn("[generate-cover-image] uncroppable", { rawWidth, rawHeight, rawRatio });
      return json(
        {
          code: "off_ratio",
          actual_ratio: rawRatio,
          target_ratio: TARGET_RATIO,
          message: crop.reason,
        },
        422,
      );
    }
    const finalBytes = new Uint8Array(crop.png);
    const finalWidth = crop.width;
    const finalHeight = crop.height;
    const finalRatio = finalWidth / finalHeight;
    console.log("[generate-cover-image] dims", {
      raw: `${rawWidth}x${rawHeight}`,
      raw_ratio: rawRatio.toFixed(4),
      cropped: `${finalWidth}x${finalHeight}`,
      final_ratio: finalRatio.toFixed(4),
      target_ratio: TARGET_RATIO.toFixed(4),
    });

    // Upload.
    const ts = Date.now();
    const path = `work-orders/${work_order_id}/cover-${ts}.png`;
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, finalBytes, { contentType: "image/png", upsert: false });
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

    return json(
      {
        cover_image_url,
        cover_image_prompt,
        debug: {
          raw_width: rawWidth,
          raw_height: rawHeight,
          raw_ratio: rawRatio,
          cropped_width: finalWidth,
          cropped_height: finalHeight,
          final_ratio: finalRatio,
        },
      },
      200,
    );
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

type CropResult =
  | { ok: true; png: Buffer; width: number; height: number }
  | { ok: false; reason: string };

// Center-crop the decoded PNG to 16:9. When the source is already 16:9 (within
// rounding), this is effectively a no-op. Rejects only when the resulting crop
// would fall below the minimum usable banner resolution.
function centerCropTo16x9(src: PNG): CropResult {
  const { width: W, height: H } = src;
  const ratio = W / H;

  let cropW: number;
  let cropH: number;
  if (Math.abs(ratio - TARGET_RATIO) < 1e-6) {
    cropW = W;
    cropH = H;
  } else if (ratio > TARGET_RATIO) {
    // Too wide: keep height, narrow width.
    cropH = H;
    cropW = Math.round(H * TARGET_RATIO);
  } else {
    // Too tall: keep width, shorten height.
    cropW = W;
    cropH = Math.round(W / TARGET_RATIO);
  }

  if (cropW < MIN_CROPPED_WIDTH || cropH < MIN_CROPPED_HEIGHT) {
    return {
      ok: false,
      reason: `cropped ${cropW}x${cropH} below minimum ${MIN_CROPPED_WIDTH}x${MIN_CROPPED_HEIGHT}`,
    };
  }

  const xOffset = Math.floor((W - cropW) / 2);
  const yOffset = Math.floor((H - cropH) / 2);

  const out = new PNG({ width: cropW, height: cropH });
  for (let y = 0; y < cropH; y++) {
    const srcRowStart = ((yOffset + y) * W + xOffset) * 4;
    const dstRowStart = y * cropW * 4;
    src.data.copy(out.data, dstRowStart, srcRowStart, srcRowStart + cropW * 4);
  }
  const png = PNG.sync.write(out);
  return { ok: true, png, width: cropW, height: cropH };
}
