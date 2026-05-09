# Breakroom poll — dedupe fix

## Problem

`breakroom-lms-poll` dedupes by checking `user_work_order_completions.metadata->>'breakroom_quiz_id'`. When a quiz can't be matched to a work order (current state: every quiz, since RacerX's quiz has no `source_challenge_id` mapping), `breakroom-lms-sync` returns `no_matching_work_order` and writes nothing. Next poll re-classifies the same quiz as new and re-syncs. Result: every 15 min the audit log shows `synced: 1, already_synced: 0` for the same quiz forever.

This is currently harmless but will (a) mask the real "already synced" signal once mappings exist, (b) burn API calls against Breakroom + cross-platform BBW, and (c) make audit logs unreadable.

## Fix

Track **sync attempts** separately from successful completions, so dedupe works regardless of match outcome.

### 1. New table: `breakroom_sync_attempts`

```text
id                  uuid pk
breakroom_quiz_id   integer    not null
breakroom_user_id   integer    not null
fgn_user_id         uuid       not null     -- resolved via breakroom_identity
sync_outcome        text       not null     -- 'completed' | 'no_matching_work_order' | 'sync_error'
fgn_result          text       null         -- mirror of sync response fgn_completion
bbw_result          text       null         -- mirror of sync response bbw_quiz
last_attempt_at     timestamptz not null default now()
attempt_count       integer    not null default 1
metadata            jsonb      null         -- quiz name, course id, completion date
unique (breakroom_quiz_id, breakroom_user_id)
```

RLS: admins SELECT; no client writes (service-role only).
Index on `(breakroom_user_id, breakroom_quiz_id)`.

### 2. Poll function changes (`supabase/functions/breakroom-lms-poll/index.ts`)

Replace the existing dedupe check (currently a count query against `user_work_order_completions.metadata`) with a lookup against `breakroom_sync_attempts`:

- For each quiz, check `breakroom_sync_attempts` by `(breakroom_quiz_id, breakroom_user_id)`. If a row exists AND `sync_outcome = 'completed'` → skip, increment `already_synced`.
- If row exists with `sync_outcome IN ('no_matching_work_order', 'sync_error')` → skip by default (don't retry every 15 min). Increment a new counter `skipped_unmapped` so it's visible in the audit log.
- If no row → call sync as today.
- After sync, **always** upsert into `breakroom_sync_attempts` with the outcome derived from the sync response body (`fgn_completion` / `bbw_quiz` fields). On conflict, bump `attempt_count` and update `last_attempt_at` + `sync_outcome`.

### 3. Retry policy (light touch)

To keep things simple: unmapped quizzes are skipped indefinitely once recorded. When an admin later registers the missing `source_challenge_id` mapping, they'll need a way to re-trigger. Two options — picking one is the only real decision in this plan:

- **(A) Manual reset**: admin deletes rows from `breakroom_sync_attempts` for that quiz; next poll picks them up. Simple, no new UI.
- **(B) Time-based retry**: re-attempt unmapped rows older than N days (e.g., 7) automatically. Adds one `OR last_attempt_at < now() - interval '7 days'` to the skip check.

Recommendation: **(A)** for v1. It's one DELETE, matches the manual nature of mapping work, and avoids surprise re-syncs.

### 4. PollResults shape

Add `skipped_unmapped: number` to the response and audit log so the dashboard view of `system_audit_logs` clearly separates "new completions landed" from "stuck unmapped quizzes still being seen by Breakroom."

## What this does NOT do

- Does not fix the underlying mapping gap (RacerX's quiz still has no matching `work_orders.source_challenge_id`). That's data work, separate from this code change. After this lands, the next poll's audit log will show `skipped_unmapped: 1` instead of looping `synced: 1` forever, making the gap explicit.
- Does not touch `breakroom-lms-sync`. Sync still returns `no_matching_work_order` on miss; poll just records that outcome.
- Does not affect the SCORM v0.2 contract — completely separate pipeline.

## Files touched

- `supabase/migrations/<new>.sql` — `breakroom_sync_attempts` table + RLS + index
- `supabase/functions/breakroom-lms-poll/index.ts` — replace dedupe check, add upsert, add `skipped_unmapped` counter
- `docs/breakroom-integration.md` — document the new table + manual-reset workflow under Troubleshooting

No UI work, no changes to `breakroom-lms-sync`, no changes to `user_work_order_completions`.

## Decision needed before implementation

Retry policy: **(A) manual reset** or **(B) time-based 7-day auto-retry**?
