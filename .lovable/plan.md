# Smoke Test: 3 Untested SCORM Destinations

Mirror the fgn-academy smoke from last sync against `external-lms`, `broadband-workforce`, and `simu-cdl-path`. No code changes — this is pure verification. Approve to switch to default mode and execute.

## Why approval is needed

`scorm-build` is state-changing (inserts `scorm_courses` rows, uploads ZIP + manifest to `media-assets` storage, calls play.fgn.gg). Plan mode is read-only, so I need approval to invoke it.

## Test matrix

Pick one work order with a valid `fgn_origin_challenge_id` (so the play.fgn.gg fetch succeeds — same fix that unblocked fgn-academy). Build it once per destination, then build a second time to verify replacement semantics.

| # | destination | brandMode | scormVersion | pass criteria |
|---|---|---|---|---|
| 1 | external-lms | enterprise | 1.2 | 200, manifestUrl reachable, zipUrl downloads, `is_replacement: false` |
| 2 | external-lms | enterprise | 1.2 | 200, `is_replacement: true`, prior row replaced (same WO+dest) |
| 3 | broadband-workforce | enterprise | 1.2 | 200, manifest + zip ok, `is_replacement: false` |
| 4 | broadband-workforce | enterprise | 1.2 | 200, `is_replacement: true` |
| 5 | simu-cdl-path | enterprise | 1.2 | 200, manifest + zip ok, `is_replacement: false` |
| 6 | simu-cdl-path | enterprise | 1.2 | 200, `is_replacement: true` |

`enhanceText` / `enhanceCover` left **off** — pure builder smoke, no Anthropic/OpenAI calls (Step 5/6 territory).

## Execution steps

1. `read_query` against `work_orders` to pick a candidate row with non-null `fgn_origin_challenge_id` and `is_active = true`. Prefer one already used in fgn-academy smoke for apples-to-apples.
2. For each destination: invoke `scorm-build` via `supabase--curl_edge_functions` with `{ workOrderId, destination, brandMode: 'enterprise', scormVersion: '1.2' }`.
3. For each response: `curl -I` the `manifestUrl` and `zipUrl`, assert 200 + non-zero content-length.
4. Re-invoke same payload, assert `is_replacement: true` and that the previous `scorm_courses.id` for `(work_order_id, destination)` was superseded (query `scorm_courses` ordered by `created_at desc`).
5. Check `scorm-build` edge logs for warnings/errors per call.
6. Cleanup: leave the latest row per destination in place (useful as a baseline for Step 5 diff). Delete intermediate replaced rows only if they accumulate.

## Deliverable

Single results table back to you:
- destination → http status, manifestUrl HEAD, zipUrl HEAD (size), is_replacement on 2nd call, any warnings[], any log noise
- pass/fail per row, plus a one-line "clean baseline" / "regression in X" summary

Estimated wall time: ~3–5 min (6 invocations + HEAD checks).

## Out of scope

- No DB schema changes, no edge function edits, no toolkit-side coordination.
- Not touching the `fgn_origin_challenge_id` fix (already in repo at the lines you're backporting as d447fe4).
- Not exercising `enhanceText`/`enhanceCover` — that's Step 5/6.