# Stage A — award-flow separation, shadow mode, origin tracking, per-program health

Status: built, deployed, and live-tested (2026-09-30). All test rows removed after each test.

## A1 — Award flow guard

`enforce_award_flow_guard()` (SECURITY DEFINER trigger, BEFORE INSERT on `user_points` and `skill_credentials`)
blocks any record with `award_pathway = 'evidence_model'` while Skill Verification is dormant:

- **Blocked (tested):** insert of `user_points` with `award_pathway='evidence_model'` raised
  `P0001 award_pathway=evidence_model is disabled while Skill Verification is dormant (no credential or XP may be minted from partner evidence)`.
- **Allowed (tested):** the same inserts with `award_pathway='legacy_completion'` succeed (control rows inserted then deleted).
- `EXECUTE` on the guard function is revoked from `anon`/`authenticated`/`public` (only service_role + triggers need it).

## A2 — Shadow-mode sources produce no learner outcomes

Live endpoint test against the deployed `learning-source-webhook` with a temporary test source (`zz-shadow-test`, shadow_mode=true):

- Push of `achievement.earned` returned `202 {"ok":true,"recorded":true,"reason":"shadow_mode"}`.
- Recorded attempt status `shadow`; **zero** `skill_credentials` rows created.
- Positive control (same source, shadow_mode=false): the event dispatched normally
  (signature mode `unsigned`; it failed minting only on an issuer FK for the temporary source, which proves dispatch occurred — the shadow branch had silently swallowed it).

## A3 — Outbound enqueue skips target-site-originated events

DB-level test on `user_work_order_completions` for an eligible existing user + challenge-backed work order:

- Completion with `origin_site='play'` → `play_outbound_queue` rows: **0** (skipped).
- Completion with `origin_site='academy'` → `play_outbound_queue` rows: **1** (enqueued).
- Both test completions and queue rows deleted afterwards.

## A5 — Per-program integration health

New edge function `integration-health` (admin-only via `has_role(admin)`; 401 unauthenticated — tested)
returns per learning source (active, strict/shadow signing, last success, failures in 7 days, retry backlog)
and per program (active work orders, outbound backlog, last outbound success, availability),
plus the contract version (`2026-10-01.1`).

Live result: both sources (play, bbw) pass with zero backlog; all 9 programs pass.
Admin UI: **Program Integration Health** panel on Admin → Sync Tester (`ProgramIntegrationHealth.tsx`).

Standing findings surfaced by the panel (not caused by Stage A):

- `play` and `bbw` both run in **relaxed signature mode** (`strict_mode=false`) — unchecked events could reach learners until strict signing is switched on.
- `last_outbound_success_at` is null everywhere: no outbound deliveries have completed yet (queue is currently empty).

## A4 — Scripted regression suite (remaining)

Planned: a scripted suite covering duplicate completion, out-of-order events, unmapped learner
(signup → one credential issued → second retry creates no duplicate), cross-org submission,
withdrawn evidence, and outage/backoff behavior. Not yet written.

## Review-2 clarifications — live results (2026-09-30, temporary `lstest` fixture source, removed afterwards)

Completed (deployed endpoints, no mocks):
1. Invalid signature → `quarantined`, repeat → duplicate `learner_outcome:false`; 0 credentials.
2. Signed `evidence.approved` → one `supporting_evidence` record; repeat → duplicate; 0 credentials, 0 XP.
3. Unknown learner → `unmapped`; repeat → duplicate, stays pending.
4. Six simultaneous identical deliveries → one processed (200), five refused (409).
5. Verified account link (`external_id`) → replay queued → exactly one credential; resend of same delivery → duplicate; new delivery id for same achievement → duplicate credential prevented; second replay → 0 matched. Failure history preserved across two induced failures.
6. Strict source with missing secret → 503.
7. Pilot reward without an accepted pilot review → refused by database guard; pilot pathway cannot mint credentials.

Defects found and fixed during testing: identity-link replay trigger violated the queue's reason constraint (every link would have errored); replay overwrote identity fields on failure (row became unfindable); per-credential uniqueness existed only for Play keys (a second credential was issued, then removed, before the generic index was added).

Planned, not yet run: concurrent `redeem_points` overspend test and refund reversal (needs a signed-in test learner with credits); full pilot journey with a real reviewer; browser check of sign-in intent through email confirmation.

## Release-gate clarifications (2026-09-30)
- Duplicate deliveries: completed duplicate → 200 `{duplicate:true, learner_outcome:true}`, no new outcome. In-flight duplicate (processing/queued) → 409 with `Retry-After: 30`; partner retries with the SAME delivery id. Failed → re-claimed on retry.
- Signed-in Passport audited: score shows "Not yet scored" when absent; organization average renders only when real data is passed (none is today); records grouped Participation / Reviewed Demonstrations / FGN Educational Merits / Organization-Issued with non-certification language.
- redeem_points(option, request_key): repeated request with the same key returns the original redemption (one debit). Per-learner lock prevents overspend; refunds refuse a second reversal.
- Pending: live concurrent redemption, pilot journey, browser sign-in return tests (need a signed-in test learner and reviewer), Merits review, scanner triage.

## QA test accounts (2026-10-01) — keep until open tests finish
- Learner `qa-learner@fgn.academy` (05507d7c-4be0-4216-91f6-fac4f9210164): FGN Global member; one ledger entry `qa-grant-2026-10-01` = 500 credits, no XP.
- Reviewer `qa-reviewer@fgn.academy` (44809e2b-6588-405f-9eee-ea966fbc8cb9): FGN Global organization admin only (no platform admin role) — may review FGN Global evidence.
- Inactive redemption options on Heavy Equipment: "QA Test Option A" (300) and "QA Test Option B" (350); combined 650 > 500.
- Cleanup after testing: delete QA options, QA ledger/redemption rows, memberships, then the two accounts.

## Points redemption acceptance — live (2026-10-01, signed-in QA learner via REST, options activated only during the test)
- Two simultaneous redemptions (300 + 350 against 500): exactly one succeeded (B, 350); the other refused `insufficient points`.
- Same request key sent 3× in parallel: all returned the original redemption id; one debit only (balance 150, 1 redemption row).
- Learner calling refund: refused `platform admin required`.
- Two simultaneous admin refunds: one reversal entry created, the other refused `not reversible`; a third attempt also refused. Balance back to 500, redemption status `reversed`, exactly 1 reversal ledger entry.
- QA options deactivated again afterwards. Remaining: pilot journey, browser sign-in return.
