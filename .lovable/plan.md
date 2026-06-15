# Build: backfill-play-source + Refresh button, then dry-run on 6 HF rows

Approved scope locked. Two reporting additions baked in.

## 1. Edge function `supabase/functions/backfill-play-source/index.ts`

Admin-only (Bearer token → `has_role(user,'admin')`). Mirrors `fetch-challenges` auth.

**Request**
```json
{ "work_order_ids": ["uuid", ...], "dry_run": true, "force": false }
```
Defaults: `dry_run=true`, `force=false`. Re-runs are no-ops on already-populated rows.

**Logic**
1. Select WOs: `id, fgn_origin_challenge_id, title, cover_image_url, difficulty, xp_reward, description, game_title, category_key, channel_id, skills_required, metadata`, filtered by `work_order_ids` when provided, plus `fgn_origin_challenge_id IS NOT NULL`. When `force=false`, also require `metadata->'play_source' IS NULL` (skipped rows reported as `skipped-already-present`).
2. Single cached upstream call: `POST ${FGN_PLAY_SUPABASE_URL}/functions/v1/ecosystem-data-api` with `{ action: 'challenges' }` + `{ action: 'games' }` (for `game_name` resolution). Build a map keyed by challenge `id`.
3. Per row, look up by `fgn_origin_challenge_id`. Not in map → `not-found-on-play`.
4. Build `play_source` from the same `PLAY_CHALLENGE_FIELDS` whitelist as `fetch-challenges` (lossless): `id, name, description, game_id, challenge_type, difficulty, points_reward, estimated_minutes, start_date, end_date, requires_evidence, cover_image_url, game_name, is_active, is_featured, created_at, updated_at`.
5. `dry_run=true`: return the full payload, no DB write.
6. `dry_run=false`: `UPDATE work_orders SET metadata = jsonb_set(coalesce(metadata,'{}'::jsonb), '{play_source}', $snapshot::jsonb, true) WHERE id = $1`. Only `metadata` touched.
7. Log into `play_sync_attempts` (`direction='outbound'`, `action='backfill-play-source'`).

**Response**
```json
{
  "dry_run": true,
  "summary": { "would_update": 6, "updated": 0, "skipped_already_present": 0, "not_found_on_play": 0 },
  "rows": [
    {
      "work_order_id": "...",
      "fgn_origin_challenge_id": "...",
      "current_title": "...",
      "current_cover_image_url": "...",   // leg-1 — preserved
      "status": "would-update",
      "play_source": { /* full snapshot */ },
      "preview": {
        "name": "...", "description": "...", "cover_image_url": "...",  // leg-2 fallback only
        "difficulty": 0, "points_reward": 0, "game_name": "...",
        "challenge_type": "...", "estimated_minutes": 0,
        "requires_evidence": false, "is_active": true, "is_featured": false,
        "start_date": null, "end_date": null,
        "created_at": "...", "updated_at": "..."
      }
    }
  ]
}
```

## 2. Admin "Refresh play_source" button — `src/pages/WorkOrderDetail.tsx`

Admin-only panel (gated via `useUserRole().isAdmin`).
- Click → invokes function with `{ work_order_ids: [thisId], dry_run: true, force: true }`, opens a diff dialog (current `metadata.play_source` vs. fresh snapshot).
- Confirm → re-invokes with `dry_run: false, force: true`, refetches the WO.
- Uses `supabase.functions.invoke('backfill-play-source', ...)`.

## 3. Execute the dry run on the six HF rows and report

After deploy, call `{ work_order_ids: [<6 HF ids>], dry_run: true }`. Report per row: name, description, cover_image_url, difficulty, points_reward, game_name, plus the full snapshot.

Add to the dry-run report:

**Cover inheritance confirmation.** The `cover_image_url` inside each `play_source` snapshot is the **challenge's own cover from play.fgn.gg**. It lives at `metadata.play_source.cover_image_url` only — leg-2 fallback. The work order's `cover_image_url` column (leg-1, the dedicated covers you placed) is **not read, not written, not touched** by this function. Inheritance order downstream (cover-prompt synthesis, naming/provenance) stays: leg-1 `work_orders.cover_image_url` wins; leg-2 `metadata.play_source.cover_image_url` only used when leg-1 is null. The dry-run report will state this explicitly per row.

**Then HOLD** for approval before any `dry_run: false` write.

## 4. Post-write report (after approval)

After running `dry_run: false`:
1. SELECT the six rows; verify `metadata.play_source` populated and the nine other field columns (`title, cover_image_url, difficulty, xp_reward, description, game_title, category_key, channel_id, skills_required`) are byte-identical to pre-write.
2. **Convergence statement.** Compare the post-backfill row shape to what a net-new INSERT from the import UI (`WorkOrderEditDialog`) produces. Report explicitly: is `metadata.play_source` the ONLY field a net-new import would populate that these six were missing? If yes → six are structurally identical to net-new imports (convergence achieved). If any other gap exists, list it.

## Scope guardrails (non-negotiable)

- Only column written: `work_orders.metadata` via `jsonb_set` on the `play_source` key.
- Untouched: `simulations`, `simulation_items`, `lessons`, `challenge_lesson_mappings`, `user_work_order_completions`, `cover_image_url`, every other WO column, every relationship.
- No schema migration. No change to `fetch-challenges`. No change to the `already_imported` import-UI gate.
- Idempotent: default flags = no-op on populated rows.