
# House Flipper Track — Step 2: Work Orders

Preflight confirmed (re-verified at build time): zero rows in `work_orders` match the six `fgn_origin_challenge_id` values. All six are net-new. No aviation rows touched.

## Step 1 — Migration: extend `game_title` enum

Idempotent guards so a re-run is safe and the enum order stays append-only.

```sql
ALTER TYPE public.game_title ADD VALUE IF NOT EXISTS 'House_Flipper';
ALTER TYPE public.game_title ADD VALUE IF NOT EXISTS 'House_Flipper_2';
```

Runs in its own migration (Postgres requires enum-add to commit before use in the same transaction as a subsequent insert that references the new label).

## Step 2 — Re-run preflight, then insert the six rows

Before insert, the build will re-query:

```sql
SELECT fgn_origin_challenge_id, title FROM work_orders
WHERE fgn_origin_challenge_id IN (<six UUIDs as text>);
```

Any UUID that comes back is skipped (no update, no duplicate). Only missing ones are inserted. Expected on a clean preflight: six inserts, zero skips.

## Step 3 — Insert payload

Keyed by `fgn_origin_challenge_id` (text). All rows: `is_active=true`, `metadata='{}'`, `success_criteria` left to column default, `tenant_id=null`, `estimated_time_minutes` default (30) — XP is the canonical metric per project doctrine, time is not surfaced.

| WO | Title | Game | Difficulty | XP | fgn_origin_challenge_id |
|---|---|---|---|---|---|
| WO-3010 | Strip the Room to a Safe Shell | House_Flipper_2 | beginner | 12 | 3b061d99-c5a8-418b-9fe6-03e2eb6118e9 |
| WO-3020 | Load Out for a Paint and Patch Day | House_Flipper | beginner | 13 | ac805af3-9677-436c-9107-e3d4139e3ebd |
| WO-3030 | Tile a Wet-Area Floor That Lasts | House_Flipper_2 | intermediate | 15 | 74175dec-85e9-4f00-992d-cbbcde24f6e5 |
| WO-3110 | Frame a New Interior Wall | House_Flipper_2 | advanced | 20 | ee93f07b-4c2c-4788-be1a-67f02d750b47 |
| WO-3120 | Load Out to Build a Roof | House_Flipper_2 | intermediate | 16 | d00bdfd0-6702-4e46-9ee8-6202aecf9005 |
| WO-3130 | Price the Flip Before You Commit | House_Flipper | advanced | 18 | e1b8d879-24a4-498b-bbff-acf17a076eed |

Two on `House_Flipper`, four on `House_Flipper_2`, matching parent challenge `game_id` on play.fgn.gg.

## Acceptance probes (reported after build)

1. `SELECT title, game_title, difficulty, xp_reward, is_active, fgn_origin_challenge_id FROM work_orders WHERE fgn_origin_challenge_id IN (<six>) ORDER BY title;` — expect 6 rows matching the table above exactly.
2. Created-new vs already-existing tally (expected 6/0 on a clean preflight, otherwise reconciled to existing).
3. Aviation untouched: `SELECT count(*) FROM work_orders WHERE game_title = 'MSFS_2024';` — unchanged from prior inventory (6 active).
4. Enum extended: `SELECT unnest(enum_range(NULL::game_title))::text;` includes both `House_Flipper` and `House_Flipper_2`.

## Out of scope (held for later steps)

- Step 3 sims (simulations + simulation_items)
- Step 4 lessons (xp_reward=0, mapped via challenge_lesson_mappings)
- Course publish + backfill
- No edits to aviation, no edits to any non-House-Flipper row, no UI changes, no enum consumers updated yet (filters in WorkOrdersManager, GAME_LABELS, channel seeding — out of scope for Step 2; will be addressed when UI surfaces are needed).

## Hold

Plan held for your approval. On go, I'll run the enum migration first (separate approval surface), then the insert, then report the acceptance probes verbatim.
