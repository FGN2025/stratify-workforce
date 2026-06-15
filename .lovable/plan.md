## Build: crop-to-16:9 instead of reject; contract v1.1; live test

### 1. `generate-cover-image/index.ts` — replace ratio gate with center-crop

After decoding the returned PNG, decode pixels (use `npm:pngjs@7` — pure-JS, Deno-compatible), then:

- Compute `actual = width / height`, `target = 16/9 ≈ 1.7778`.
- **If `|actual - target| / target <= 0.005`** (essentially on-target, e.g. gpt-image-2's 1792×1024 at 1.75 is within 1.5% — actually 1.75 is 1.5% off; we'll use a tighter "no-op" threshold of 0.5% so 1792×1024 still gets a tiny crop to true 16:9 OR we accept it as-is. Decision: skip crop only when `actual === target` to keep one code path; otherwise always crop. 1792×1024 → crop to 1792×1008, negligible loss).
- **Else crop:**
  - If `actual > target` (too wide): keep full height, new width = `round(height * target)`, x-offset = `round((width - newWidth) / 2)`.
  - If `actual < target` (too tall/portrait): keep full width, new height = `round(width / target)`, y-offset = `round((height - newHeight) / 2)`.
- **Uncroppable rejection** (narrow, per your spec): reject with `{ code: "off_ratio", actual_ratio, target_ratio }` only when:
  - cropped width `< 1024` OR cropped height `< 576` (below acceptable banner resolution), OR
  - `actual < 0.75` (severely portrait — Gemini occasionally returns 1:1 or square-ish; 1:1 → cropped 1024×576 from 1024×1024 = OK, so 1:1 passes; only block when crop would be < 576 tall from a portrait original).
  - In practice: 1024×1024 → crops to 1024×576, passes. 768×1024 portrait → crops to 768×432, fails resolution gate.
- Re-encode the cropped pixels back to PNG using `pngjs` and upload the cropped buffer (not the original).
- Log raw dims, cropped dims, and final ratio for observability.

### 2. Contract update — `docs/cover-prompt-contract.md` → v1.1

- Update changelog with a v1.1 line: "Switched from reject-on-off-ratio to center-crop-to-16:9 after generation. Reject only when uncroppable (resolution floor or degenerate aspect)."
- §6 / §7: revise the procedure. Replace step 4's reject language with:
  > 4. Center-crop the decoded PNG to 16:9. When the model honors `size` natively (e.g. `openai/gpt-image-2` at `1792x1024`), the crop is a no-op or near-no-op. When the model ignores `size` (e.g. Gemini image models), crop the returned dimensions to 16:9. Reject with `off_ratio` only when the resulting crop would fall below `1024×576` or the source is severely portrait such that no usable 16:9 region exists.
- §7 `size: "1792x1024"` request stays (honored by OpenAI, ignored by Gemini → then cropped). Add a note clarifying this.
- §8 `off_ratio` semantics updated: now means "uncroppable", not "outside ±3%".

### 3. Live end-to-end test

Against work order `cb71ebac-b274-4a53-b968-a6c8f82f1800` (Fiber Line Installation):
1. Call `synthesize-cover-prompt` → capture prompt.
2. Call `generate-cover-image` with that prompt.
3. Report: raw width × height returned by Gemini, cropped width × height, final ratio, stored `cover_image_url`, and visual eyeball of the result.

If the result is awkwardly cropped (e.g. main subject sliced off), I will flag it and we can discuss either (a) accepting it for v1.1 and revisiting cropping strategy (e.g. saliency-based) in v1.2, or (b) switching that work order to gpt-image-2 via `ai_platform_settings` and regenerating to compare.

### Technical detail

- `pngjs` import: `import { PNG } from "npm:pngjs@7";` — works in Deno via the npm: specifier; pure-JS, no native deps.
- Decode: `PNG.sync.read(buffer)` returns `{ width, height, data: Uint8Array of RGBA }`.
- Crop: allocate new RGBA buffer of `croppedW * croppedH * 4`, copy row by row from `srcY = yOffset` to `yOffset + croppedH`, starting at `xOffset * 4` for `croppedW * 4` bytes per row.
- Encode: `PNG.sync.write(new PNG({ width, height, data }))` → Buffer; upload as `Uint8Array`.
- No change to the storage path scheme, the prompt persistence, or the auth/admin checks.
- No change to `synthesize-cover-prompt`.
- No DB migration needed (semantics change, no schema change).

### Out of scope (per your direction)

- Saliency-aware cropping (face/subject detection). Center-crop only for v1.1.
- Changing the default model. Gemini stays default; gpt-image-2 remains the premium swap via `ai_platform_settings.cover_image_model`.
- Configurator-side work. Still on hold pending contract approval.

Approve and I'll implement, deploy, run the test, and paste raw dims / cropped dims / ratio / URL back here.