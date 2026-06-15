# Cover Prompt Contract — v1.1

Status: **Draft for review** (academy-side implementation conforms to this; Configurator implements against it after approval.)

Source of truth for the work-order-aligned cover image generation pipeline. Both implementations (fgn.academy + Configurator) MUST conform to this contract. The contract is written so it could later back a hosted HTTP service with minimal change — function signatures already match an HTTP boundary.

## Changelog
- **v1.1** — Switched from reject-on-off-ratio to center-crop-to-16:9 after generation. Reject only when the resulting crop would fall below the minimum usable banner resolution (1024×576). Motivation: Gemini image models ignore the `size` request parameter and return their own dimensions, so a strict ±3% reject gate failed nearly every generation. Cropping keeps the cheap default model viable while still guaranteeing 16:9 output.
- **v1.0** — Initial. Two-step pipeline (synthesize prompt → generate image). Industry-neutral language rule. 16:9 enforcement. Server-enforced style wrapper.

---

## 1. Pipeline

Two visible steps, surfaced in the admin UI:

```
            ┌───────────────────────────────┐
work_order ─►  synthesizeCoverPrompt(input) ├──► editable prompt (UI)
            └───────────────────────────────┘
                                                 │ admin reviews, optionally edits
                                                 ▼
            ┌───────────────────────────────┐
            │  generateCoverImage(input)    ├──► 16:9 PNG → ratio check → storage → DB
            └───────────────────────────────┘
```

Step 1 returns a prompt string. The admin sees it and may edit before step 2 runs. Step 2 enforces the style wrapper, generates, ratio-verifies, and persists.

---

## 2. Inputs

### 2.1 `synthesizeCoverPrompt`

```ts
type SynthesizeCoverPromptInput = {
  title: string;            // required, non-empty
  description: string | null;
  game_title: string;       // raw enum value, e.g. "House_Flipper_2"
  category_key: string | null;
  difficulty: string | null;        // e.g. "beginner" | "intermediate" | "advanced"
  play_source_blurb: string | null; // best-effort: metadata.play_source.description or similar
  admin_steer: string | null;       // optional admin guidance, e.g. "emphasize night work"
};

type SynthesizeCoverPromptOutput = {
  prompt: string;           // single paragraph, <= 1200 chars, no markdown
};
```

Field-mapping rules:
- `game_title` enum → human display name via lookup table (§5). Examples: `House_Flipper_2` → "house renovation", `American_Truck_Simulator` → "long-haul trucking", `Microsoft_Flight_Simulator_2024` → "commercial aviation". The display name is a **trade context**, not the platform/sim name.
- If `play_source_blurb` is non-empty, prefer it as the primary scene reference. Otherwise synthesize from `title + description + trade context`.
- `admin_steer` is injected BEFORE the style wrapper, never after. It cannot override the wrapper or the neutral-language rule.
- Drop fields that don't exist on academy work orders. Do not invent values for: `job_label`, `briefing`, `sim_type`, item content. They are NOT part of this contract.

### 2.2 `generateCoverImage`

```ts
type GenerateCoverImageInput = {
  work_order_id: string;    // UUID
  prompt: string;           // the (possibly admin-edited) prompt from step 1
};

type GenerateCoverImageOutput = {
  cover_image_url: string;          // public URL in media-assets
  cover_image_prompt: string;       // final prompt sans wrapper (what was stored to DB)
};
```

---

## 3. Neutral-language rule (ENFORCED)

The generated prompt MUST describe the real-world scene and the work generically. It MUST NOT echo platform-internal archetype jargon, sim-type labels, or game-mechanic vocabulary into the image prompt. This applies even when those words appear verbatim in the work order title or description.

### Banned in output prompt
- "load out", "loadout", "loadouts"
- "plan the route", "route plan", "plan your route"
- "sim", "simulator", "simulation", "in-game", "gameplay"
- "challenge", "work order", "job task", "objective", "mission"
- "tutorial", "training scenario", "playthrough"
- Sim-type / archetype labels (e.g. "spatial task", "sequence task", "loadout task", "debrief")
- Platform-flavored verbs (e.g. "deploy", "spawn", "complete")

### Required substitutions
- "loadout" → describe the actual tools/equipment in the scene (e.g. "with a tool belt and a circular saw")
- "plan the route" → describe the actual movement/path (e.g. "approaching a worksite at dawn")
- "challenge/work order" → describe the work itself (e.g. "framing a roof", "demolishing interior drywall")
- Sim names → the trade context (see §5)

The image is about the **real-world scene** (a roof being built, a room being demolished, a tractor working a field), never the platform's internal term for the sim type. The synthesizer translates work-order-speak into scene-speak.

---

## 4. System prompt (synthesizer)

The synthesizer model receives this exact system prompt:

```
You write single-paragraph image prompts for cinematic 16:9 cover banners
that depict real-world industrial and trade work.

You will be given a work order's metadata. Translate it into a vivid,
concrete scene description suitable for an image model.

HARD RULES — these are non-negotiable:

1. Describe the real-world scene and the work generically. NEVER echo
   platform-internal jargon, sim/game vocabulary, or archetype labels,
   even if those words appear in the input. Banned terms include but are
   not limited to: "load out", "loadout", "plan the route", "sim",
   "simulator", "in-game", "gameplay", "challenge", "work order",
   "mission", "objective", "tutorial", "spatial task", "sequence task",
   "loadout task", "debrief", "deploy", "spawn".

2. Translate work-order vocabulary into scene vocabulary:
   - "loadout" → describe the actual tools/equipment in the scene
   - "plan the route" → describe the actual movement or location
   - "challenge / work order" → describe the work being done
   - Sim/game names → the underlying trade (e.g. "house renovation",
     "long-haul trucking", "commercial aviation", "row-crop farming")

3. People may appear in the scene as workers, but faces must not be
   clearly identifiable. Acceptable: face turned away, in profile,
   distant, partially obscured by safety gear, in shadow, or framed
   below the shoulders. Empty scenes are also acceptable.

4. Single paragraph. No markdown. No lists. No headings. No quotes
   around the prompt. <= 1200 characters total.

5. Concrete, photoreal, cinematic. Specific time of day, lighting,
   weather, materials, tools, vantage point. Industrial palette.

6. Do not mention aspect ratio, resolution, or camera specs — those are
   handled by the style wrapper appended downstream. Do not include the
   words "16:9", "cinematic", or "photoreal" in your output; the wrapper
   adds those.

OUTPUT: only the prompt paragraph. Nothing else.
```

The user message provides the work-order metadata as labeled fields.

---

## 5. Trade-context lookup table

```ts
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
```

Implementations MUST extend this table when adding sims. Unknown enums fall back to `"industrial trade work"` and the synthesizer relies on title/description alone.

---

## 6. Style wrapper (ENFORCED, server-side, non-strippable)

After step 1 produces the prompt (and the admin optionally edits it), step 2 appends this wrapper before sending to the image model. The wrapper is added server-side. Admins cannot remove it. The admin-edited prompt is sent FIRST, the wrapper LAST.

```
. Style: cinematic 16:9 cover banner, photoreal, dramatic natural
lighting, shallow depth of field, industrial color palette (deep blues,
warm ambers, weathered metal, concrete, dust in light). Wide composition
with strong negative space on one side suitable for an overlay. Any
people present appear as workers in context with faces not clearly
identifiable (turned away, in profile, distant, partially obscured by
safety gear, or framed below the shoulders). No text, no typography, no
logos, no watermarks, no UI overlays, no game HUD elements.
```

Note on faces: "no people faces" means **no clearly identifiable faces**, NOT "no people at all". Workers in the scene are encouraged where they fit the work (e.g. a roofer on a roof, a mechanic at a lift) provided their face is not clearly identifiable.

The final string sent to the image model is:

```
<admin-edited prompt>
<STYLE_WRAPPER>
```

The text stored to `work_orders.cover_image_prompt` is the admin-edited prompt only, WITHOUT the wrapper. The wrapper is reconstructed at generation time from the contract version.

---

## 7. Image generation contract

```ts
const IMAGE_CONFIG = {
  // Read from ai_platform_settings.cover_image_model; swappable without code change.
  default_model: "google/gemini-3.1-flash-image-preview",
  // Alternate: "openai/gpt-image-2" for higher quality (honors `size` natively).
  size: "1792x1024",          // Honored by gpt-image-2; ignored by Gemini (then cropped).
  aspect_ratio_target: 16 / 9,
  min_cropped_width: 1024,
  min_cropped_height: 576,
  storage_path: (work_order_id: string, ts: number) =>
    `work-orders/${work_order_id}/cover-${ts}.png`,
  storage_bucket: "media-assets",
};
```

Procedure:
1. Build final string = `<admin-edited prompt>` + `\n\n` + `<STYLE_WRAPPER>`.
2. Call AI Gateway `/v1/images/generations`. Use OpenAI-shape body for OpenAI models, Gemini chat-completions-image shape for Gemini models. `stream: false` (one-shot, server-side upload).
3. Decode the returned `b64_json` PNG (pixels + dimensions).
4. **Center-crop the decoded PNG to 16:9.** When the model honors `size` natively (e.g. `openai/gpt-image-2` at `1792x1024`), the crop is a no-op or near-no-op. When the model ignores `size` (e.g. Gemini image models, which choose their own dimensions per prompt), crop whatever was returned to 16:9. Crop strategy is center-crop: if `width/height > 16/9`, keep full height and narrow the width symmetrically; if `width/height < 16/9`, keep full width and shorten the height symmetrically.
5. Reject with `{ code: "off_ratio", actual_ratio, target_ratio }` ONLY when the resulting crop would fall below `1024×576` (the minimum usable banner resolution). This catches degenerate cases (tiny outputs, severely portrait images) without rejecting normal non-16:9-but-croppable output. The `off_ratio` code now means "uncroppable", not "outside ±3%".
6. Otherwise upload the **cropped** PNG to `media-assets/work-orders/<id>/cover-<ts>.png`.
7. Update `work_orders` row: `cover_image_url = <public URL>`, `cover_image_prompt = <admin-edited prompt sans wrapper>`. Single transaction.
8. Return `{ cover_image_url, cover_image_prompt }`. Implementations MAY include a `debug` block with `raw_width`, `raw_height`, `raw_ratio`, `cropped_width`, `cropped_height`, `final_ratio` for observability.



---

## 8. Errors (uniform shape)

```ts
type CoverError =
  | { code: "unauthorized" }
  | { code: "not_found", entity: "work_order" }
  | { code: "validation", field: string, message: string }
  | { code: "gateway", status: number, message: string }
  | { code: "moderation", message: string }
  | { code: "off_ratio", actual_ratio: number, target_ratio: number }
  | { code: "storage", message: string }
  | { code: "internal", message: string };
```

4xx from the AI Gateway is terminal — do NOT retry. Surface `gateway`/`moderation` to the UI with the upstream message. As of v1.1, `off_ratio` means the returned image was **uncroppable** to 16:9 at the minimum usable resolution (`1024×576`) — not "outside ±3% of 16:9". Normal non-16:9 output from a model that ignores `size` (e.g. Gemini) is center-cropped to 16:9 and succeeds.

---

## 9. Persistence

- `work_orders.cover_image_url` — public URL (existing column).
- `work_orders.cover_image_prompt` — text, nullable, the admin-edited prompt WITHOUT the style wrapper (new column; migration applied on academy v1.0).
- The wrapper is NOT stored; it is regenerated from the contract version at each render.

---

## 10. Implementation notes

### Academy (v1.0)
- Two Supabase Edge Functions: `synthesize-cover-prompt`, `generate-cover-image`.
- Admin-only (validate JWT + `has_role(uid, 'admin')`).
- AI tab visible in `MediaPickerDialog` only when `workOrderId` is provided. Events keep 3 tabs.

### Configurator (future, contract-conforming)
- Exports a `cover_image_prompt` string with each work order.
- Does NOT generate the image. Image generation runs on academy after import (no public endpoint).
- The Configurator's prompt-synthesis MUST produce strings that already satisfy §3 (neutral language) and §4 (system prompt rules). The academy will accept the string as-is and append the style wrapper at generation time.

### Future hosted-service migration
- The two function signatures in §2 are already HTTP-ready.
- To host: wrap each in an authenticated HTTP route at e.g. `POST /v1/cover/synthesize-prompt` and `POST /v1/cover/generate-image`. Inputs/outputs unchanged. Auth becomes a shared HMAC or OAuth client-credentials flow instead of Supabase JWT.

---

## 11. Known v1.0 limitations

- The six existing House Flipper work orders have empty `metadata.play_source`. They will synthesize from `title + description + trade context` only. Acceptable for v1. Re-importing those rows via `fetch-challenges` later will populate `metadata.play_source` and improve their synthesis quality. Not blocking.
- Aspect ratio target is the closest 16:9-ish size supported by current image models (`1792x1024` ≈ 1.75:1). The ±3% tolerance accommodates this. If a model adds true 16:9, update `size`.
- Wrapper version is currently inlined. Future iterations may version the wrapper itself (`wrapper_version: "v1.0"`) and store that alongside the prompt for audit.
