# Credential Issuance Doctrine

Status: active as of Phase D (MSFS aviation track).

## Rule

**No `skill_credential` of any kind mints from an unpublished course.**

Two enforcement points:

1. **`handle_module_milestone_credential`** (existing AFTER trigger on `user_lesson_progress`) — guards on `courses.is_published = true` before minting a `badge` milestone credential.
2. **`sync-challenge-completion`** (edge function, Phase D guard) — looks up the mapped lesson(s) for the incoming challenge, joins through `modules → courses`, and suppresses the `skill_verification` credential mint when no mapped course is published. XP, lesson progress, work-order completion, and notifications still fire — only the credential is held back.

Unmapped challenges (no `challenge_lesson_mappings` row) are not gated, since there is no course to evaluate. Mapping a challenge to an unpublished course is sufficient to suppress.

## Deliberate issuance at publish time

When a course publishes, prior passing completions are owed credentials. The publish step is a single deliberate SQL call:

```sql
SELECT * FROM public.backfill_credentials_for_course('<course_id>');
```

Returns `(minted_count, skipped_count, completions_scanned)`. Review the counts before announcing.

Guarantees of the function:

- **Idempotent.** Skips rows already present via the live mint path's dedup keys (`external_reference_id = 'completion:<uuid>'` OR legacy `= challenge_id`, scoped to passport).
- **Pass-only.** Filters `user_work_order_completions.status = 'completed'` AND `score >= 70`. Stand-down (`percent = 0`) and failed runs are excluded.
- **Refuses unpublished input.** Raises if the target course is `is_published = false`, so backfills cannot run mid-edit.
- **Service-role only.** `EXECUTE` granted only to `service_role`; not callable from client code.

## Why not automatic

Backfill is never wired to a publish trigger. Toggling `is_published` mid-edit must never spray credentials. The admin runs the function explicitly after confirming the course is final.

## Tracks this applies to

All tracks. The current unpublished course holding stub lessons for the six MSFS aviation challenges is the first user of this doctrine.
