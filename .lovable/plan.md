# Review response: six clarifications + two scope details

Adds the reviewer's clarifications to the acceptance criteria and fixes the gaps they point to. Some work done in the last round only partly meets them. Those parts are called out below and redone.

## 1. Keep unverified events apart from trusted evidence
- A delivery with a missing or invalid signature goes into a quarantine log only. It never creates evidence, never matches or links a learner, never updates progress and is never queued for replay.
- Last round, unverified deliveries were stored as record-only rows that could later match the unknown-learner replay path. Replay will now skip quarantined rows entirely.
- Decision 4 (supporting evidence only, no credential or XP) applies only to signed deliveries from an active partner that is allowed to send that event.

## 2. Make retries atomic
Delivery states and what happens when the same delivery arrives again:

| Previous state | Repeated delivery |
|---|---|
| Completed | Acknowledge; no additional outcome |
| Failed | Retry against the existing record; earlier errors are kept |
| Unmapped | Stays pending; handled only by identity recovery |
| Quarantined / shadow | Acknowledged as recorded, never as a learner completion |
| Processing | A second request at the same time is refused (409); the event is processed once |

- Add a database uniqueness rule on (source, event, delivery id), plus a single database step that claims the delivery. This replaces the current "look it up, then process" pattern.
- Each attempt is added to the delivery record's error history instead of overwriting it.

## 3. Test the right outcome for each event type
Live tests, each run before and after signup or account linking:
- Eligible completion: exactly one permitted completion or award.
- Partner evidence approval: exactly one supporting-evidence record, zero credentials, zero XP.
- Quarantined or shadow event: zero learner outcomes.
- Replay keeps the original source, organization, activity version and event ID.
- Two identical deliveries sent at the same time: one outcome.

Results go into the stage test report, with completed tests kept separate from planned checks.

## 4. Construction pilot points and redemption
- Add a separate server-approved reward rule, "pilot_review_reward". It is allowed only for the Excavation & Trenching pilot, only after a reviewer accepts the work, and only once per learner per task. The guard that blocks evidence-driven credentials and XP stays in place. Nothing is relabelled as a legacy completion.
- Redemption runs as one database step: it locks the balance, checks it, then deducts. Two redemptions at the same time can't overspend. Refunds are added as reversal entries.
- A redemption that unlocks a pathway step still checks that the step's required reviewed evidence has been accepted.

## 5. Check sign-in return destinations exactly
- Last round only checked that the return address starts with "/". Replace that with a fixed list of allowed destinations: Workspace, Courses, Work Orders, Passport, Programs, Settings and similar. Anything else goes to Workspace.
- Only exact approved addresses are accepted. There is no loose "starts with" matching.
- Email confirmation carries a short reference to a saved destination that expires after 30 minutes, not the destination itself. No login tokens are ever put in a web address.
- Replay after account linking only runs once the person has proved they own the account: a signed-in session plus a partner-verified identity. An email that simply matches is not enough.

## 6. Correct the Passport everywhere it appears
Remove the placeholder scores and unsupported claims, and apply the same four record groups, in:
- the signed-in Passport (done last round; re-checked here)
- the public share page
- the embedded view
- the exported PDF
- the credential API fields, where a missing score returns null or "not assessed" instead of 50

## Scope details
- **Broadband Workforce:** remove it from the connection-health panel and refuse any delivery it sends. Its old records are kept. Shared sign-in for the Workforce map stays a separate follow-up.
- **Merits:** the review stays read-only. Its compatibility findings must be finished before the organization-achievement intake terms are finalized.
- **Logo:** use the white monochrome logo already uploaded. No new design decision is needed.

## Technical details
- Migration:
  - Add a unique index on `learning_source_pull_attempts(source_slug, action, external_attempt_id)`.
  - Add `claim_learning_source_attempt()`, which inserts the row or moves it from failed to processing in one step using `FOR UPDATE SKIP LOCKED`.
  - Add an `error_history jsonb` column.
  - Add a `quarantined` status, excluded from the signup and identity-link replay triggers.
- Allow `pilot_review_reward` in the `award_pathway` check. The guard function lets it through only for the pilot Work Order when the task has an accepted review; no credential is minted.
- Add a `redeem_points()` security-definer function that takes an advisory lock per user, checks the balance view, then inserts the debit and redemption rows in one transaction.
- Add a `post_auth_intents` table (id, user-agnostic path, expires_at) that only the service role can access, plus an allowlist in `src/lib/safe-redirect.ts`.
- The Passport fixes cover `PublicPassport.tsx`, `EmbedPassport.tsx`, the `passport-pdf` function and the `credential-api` fields.
- Deactivate the `bbw` source's receive permission. Filter inactive sources out of `integration-health`.
- The contract inventory moves to 2026-10-01.2 only after section 3 passes.
