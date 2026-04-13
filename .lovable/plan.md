

# Plan: Import Cover Images from play.fgn.gg

## Current State
- The `fetch-challenges` edge function already returns `cover_image_url` from play.fgn.gg
- The Import Challenge dialog already passes `cover_image_url` through to new work orders
- **The 13 existing Fiber_Tech work orders were inserted manually** — they have `NULL` for both `cover_image_url` and `fgn_origin_challenge_id`, so there's no link back to the source challenge

## Changes

### 1. One-time data backfill (database update)
Write an UPDATE statement that matches each of the 13 Fiber_Tech work orders to their play.fgn.gg counterpart by title and sets:
- `cover_image_url` — the hosted image URL from play.fgn.gg's storage bucket
- `fgn_origin_challenge_id` — the remote challenge UUID, so future syncs work

This requires calling the fetch-challenges endpoint to get the title→image+id mapping, then running 13 UPDATE statements via the insert tool.

### 2. No code changes needed
The import pipeline (`ImportChallengeDialog` → `WorkOrderEditDialog`) already copies `cover_image_url` from play.fgn.gg challenges into new work orders. Any future imports through the admin UI will automatically carry the hero image.

### 3. No edge function changes needed
The `fetch-challenges` function already includes `cover_image_url` in its `SELECT *` query. The `sync-challenge-completion` webhook doesn't need cover images — it handles progress, not display.

## Result
- All 13 existing Fiber_Tech cards will immediately show their unique hero images from play.fgn.gg
- All future challenge imports will continue to carry images automatically
- Work orders will also gain their `fgn_origin_challenge_id` link, enabling the "already imported" indicator in the import dialog

