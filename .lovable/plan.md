

# Align sync-challenge-completion with Finalized Integration Contract

## What Changed in the Updated Guide

The play.fgn.gg team confirmed and finalized several details that our current endpoint doesn't fully handle:

1. **`score` and `completed_at` are now required fields** — our code treats `score` as optional and ignores `completed_at` from the payload (uses server time instead)
2. **`task_progress` items include `title` and `status` fields** — our `TaskProgress` interface only has `task_id`, `completed`, `completed_at`
3. **Score fallback from metadata** — if `score` is missing, compute from `metadata.awarded_points / metadata.max_points`
4. **Nested payload tolerance** — flatten `player.email` → `user_email`, `challenge.id` → `challenge_id`, etc.
5. **No `X-Source-App` header** — confirmed removed; source goes in `metadata.source` (no code change needed, we never checked for it)

## Changes Required

### 1. Update `sync-challenge-completion` Edge Function

- Expand `TaskProgress` interface to include optional `title: string` and `status: string`
- Add payload normalization layer at the top: flatten nested `player.email` → `user_email`, `challenge.id` → `challenge_id`
- Add score fallback: if `score` is undefined, check `metadata.awarded_points` and `metadata.max_points` and compute `Math.round((awarded / max) * 100)`
- Use `completed_at` from the payload (when provided) instead of always generating server time
- In task processing, resolve `completed` from either the boolean field or `status === "completed"`
- Store task `title` in the upsert metadata

### 2. Update Integration Guide Document

- Replace `/mnt/documents/play-fgn-gg-integration-guide.md` with the finalized contract content matching the PDF

### 3. Update `ChallengeSyncTester` UI

- Add a `completed_at` field (auto-filled with current timestamp, editable)
- This aligns the test tool with the finalized required fields

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/sync-challenge-completion/index.ts` | Normalization layer, score fallback, status/title handling, completed_at from payload |
| `src/components/admin/ChallengeSyncTester.tsx` | Add completed_at input field |
| `/mnt/documents/play-fgn-gg-integration-guide.md` | Replace with finalized contract |

No database migrations needed — existing tables already support all fields.

