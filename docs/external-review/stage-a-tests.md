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
