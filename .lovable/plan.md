## Goal

Force a clean redeploy of the `scorm-build` edge function so the worker stops serving pre-48779fa code, then verify the new `enhanceCourse` branches are actually executing before you re-run smoke cells 2–4.

## Source verification (already done, read-only)

Confirmed on disk in this project:

- `supabase/functions/scorm-build/index.ts`
  - L60: `import { enhanceCourse } from './_lib/course-enhancer/enhance.ts'`
  - L478: `await enhanceCourse(courseManifest, { ... })` between `transform()` and asset packaging
  - L454 / L462 / L501: emit `ENHANCER_KEY_MISSING`, `ENHANCER_IMAGE_KEY_MISSING`, `ENHANCER_FAILED`
- `supabase/functions/scorm-build/_lib/course-enhancer/` contains `enhance.ts`, `anthropic-client.ts`, `openai-client.ts`, `cache.ts`, `academy-uploader.ts`, `prompts/`

So the toolkit catchup (d447fe4 → e1aa92f) is reflected in source. The smoke signals confirm it is not reflected in the running worker.

## Steps (require build mode)

1. **Hard redeploy `scorm-build`** via `supabase--deploy_edge_functions(["scorm-build"])`. This bumps the worker version and evicts any cached instance.
2. **Tail boot logs** with `supabase--edge_function_logs` for `scorm-build` and confirm a fresh `Boot` event appears with a new `function_id` or `deployment_id` (current id seen in logs: `2fa87e37-a3b8-432d-a247-59c05d71ed97` — should change or at minimum produce a new boot timestamp ahead of the smoke run).
3. **Live-fire probe** via `supabase--curl_edge_functions` against WO `82352214-…` with `enhanceText=false, enhanceCover=false` and confirm the response shape now includes the `aiEnhanced` field (even if false/null) — that field's presence is the canary that the new orchestration block ran.
4. **Secrets sanity** via `secrets--fetch_secrets` to re-confirm `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are still set on this project. If either is missing, cells 2/3 will surface `ENHANCER_KEY_MISSING` / `ENHANCER_IMAGE_KEY_MISSING` warnings instead of silently no-op'ing — which is the *correct* new behavior and itself a positive signal that the new code is live.
5. **Hand back** to you for cells 2–4 + the CS Fiber `inferFramework()` regression check. No source edits required from my side; if step 3 still shows no `aiEnhanced` field after a confirmed fresh boot, I'll bisect into `enhance.ts` per the standing commitment (not the destination router).

## Not in scope

- No changes to `enhance.ts`, `transform.ts`, or the destination router.
- No changes to image size defaults (`1536x1024` at call site stays; library default `1024x1024` stays).
- No DB migrations.
- No frontend changes — the in-flight P0 perf work (`useUserRole` done, lazy routes / `Index.tsx` / hero images still queued) is unaffected and remains paused pending your separate approval.

## Risk

Effectively zero — this is a redeploy of code that already passed your toolkit review at e1aa92f. Worst case the redeploy surfaces a build error that was previously swallowed (your hypothesis #3), in which case the failure mode is loud (deploy fails, function stays on prior version, you keep the same baseline you have now) rather than silent.