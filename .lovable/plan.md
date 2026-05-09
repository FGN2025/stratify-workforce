## Goal

Stop double-credit on `user_points` from Breakroom and SCORM completion writers by adding an idempotency key + DB-enforced uniqueness, then making both writers insert-on-conflict-do-nothing.

## Why now

`user_points` has no unique constraint today. Three independent writers (`breakroom-lms-sync`, `scorm-session-complete`, achievement evaluators) can each insert XP rows for the same logical event. SCORM already guards via an existing-credential check, but it is an app-level race window, not a DB invariant. Breakroom has no guard at all on the WO XP insert.

## Step 1 — Schema (migration)

Add a nullable idempotency key to `public.user_points`:

- `event_key text` — stable identifier per logical award event.
- Partial unique index: `unique (user_id, event_key) where event_key is not null`.
- Backfill existing rows: leave `event_key` NULL (partial index ignores them, so no conflict on legacy data).

Key format convention (documented in migration comment):

```text
breakroom:wo:<work_order_id>:quiz:<breakroom_quiz_id>
breakroom:achv:<achievement_id>:quiz:<breakroom_quiz_id>
scorm:first-pass:<course_id>:<user_id>
```

Including the user is unnecessary because the unique index already scopes to `user_id`, but keeping it in the SCORM key keeps the literal greppable.

## Step 2 — `breakroom-lms-sync`

Two `user_points` insert sites today; both get an `event_key` and switch to `upsert` with `onConflict: 'user_id,event_key', ignoreDuplicates: true`:

1. **WO completion XP** (line ~115): `event_key = breakroom:wo:<workOrder.id>:quiz:<metadata.breakroom_quiz_id ?? course_id_external>`.
2. **Achievement XP** in `evaluateFgnAchievements`: `event_key = breakroom:achv:<achievement.id>:quiz:<...>`. Pass the quiz id through as a parameter.

If `breakroom_quiz_id` is missing from metadata, fall back to `course_id_external` so the key is always defined. No behavior change for unique events; duplicate replays become no-ops.

## Step 3 — `scorm-session-complete`

The first-pass XP insert (line ~256) gets `event_key = scorm:first-pass:<course_id>:<userId>` and switches to upsert with `ignoreDuplicates: true`. The existing `existingCred` check stays as-is (still useful for the credential row); the unique index becomes the durable backstop against concurrent terminal callbacks for the same course.

## Step 4 — Verification

- Re-run the Breakroom Mapper retry on a previously synced quiz; confirm `user_points` row count for that user/WO does not increase.
- Trigger two near-simultaneous SCORM terminal callbacks (curl) for the same course; confirm exactly one XP row.
- Spot-check `select count(*), user_id, event_key from user_points where event_key is not null group by 1,2,3 having count(*)>1;` returns zero.

## Out of scope (intentionally)

- Notification dedupe (separate concern; can reuse the same key later).
- Backfilling `event_key` on historical rows.
- Bundle-aware Breakroom crediting (the bigger Mapper change discussed previously).
- Changing `user_game_stats` math — only `user_points` is in scope.

## Files touched

- New migration: add column + partial unique index + comment.
- `supabase/functions/breakroom-lms-sync/index.ts` — 2 insert sites + helper signature.
- `supabase/functions/scorm-session-complete/index.ts` — 1 insert site.
