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

## Construction pilot journey — live (2026-10-02, qa-learner + qa-reviewer, Excavation Hazard Walk-Through step)
Driven through the same calls the Work Order and review screens make, signed in as each account.
- Baseline: 0 XP, 500 credits, 0 credentials, 0 badges, 0 skill signals.
- Learner submitted a written walk-through and a site screenshot. Reviewer accepted one and asked for a revision on the other: the step stayed open (`needs_revision`), nothing was awarded, and the learner could see the request.
- Learner resubmitted, reviewer accepted: step `demonstrated`, 2 v2 skill signals, 1 pilot reward (+50 credits). XP, credentials, badges unchanged.
- Reopen + re-accept: 0 new signals, no new reward. Learner calling the reward directly: refused (no permission). Learner inserting a pilot reward: refused by the once-only rule / pilot guard.
- Reviewer from another organization (temporary move to Oil and Gas, restored): saw 0 items, could not decide, closing refused `not permitted`.
- Pathway step (temporary "QA Pathway Step", 100, switched off afterwards): refused for an account with no reviewed evidence; learner redeemed once; repeat with the same key returned the same redemption. Balance 450.

Defects found and fixed:
1. Learner file uploads for task evidence were refused by storage rules (wrong folder layout) — every screenshot/video submission failed. Fixed path layout.
2. Organization reviewers (non-platform admins) could not open evidence files. Added read access for evidence they are allowed to review.
3. Pilot reward was never issued in the real flow (nothing called it). Now issued automatically when a pilot step closes as demonstrated; once only.
4. Any signed-in learner could add credits (or negative/reversal entries) to their own ledger and spend them. Learner inserts now limited to positive XP only; credits are server-issued.

Open defects (not fixed this round):
- Skill Passport shows placeholder employability 50.0, all-50 skill radar and a "Verified" badge for a brand-new learner (profile defaults), and does not list the reviewed demonstration. Passport record was never created for the learner.
- Work Order detail shows "~120 min" (time ban) and task progress 0/5 despite a demonstrated step.
- Learners can still self-record XP from the browser (lesson/Work Order completion); moving XP awards server-side is a separate change.
- Resubmitting the same file for a requirement returns a conflict; a new upload is required.

### Follow-up fixes (2026-10-02) — verified in the browser as qa-learner
- Passport: starter 50.0 score / all-50 skill values removed (no column defaults; 7 untouched accounts cleared) → shows "Not yet scored" and "Not yet assessed". "Verified" badge removed. Accepted steps now listed under Reviewed Demonstrations (supporting records, not certifications).
- Work Order detail: time estimate removed; reviewer-accepted steps count toward task progress (now 1 of 5).

## XP self-award and quiz marking (2026-10-02)
Run live as qa-learner@fgn.academy on lesson a1b2c3d4-0003-4000-8000-000000000001 (25 XP):
- Lesson content sent to the browser contains no answers (0 `correct_index`); answer keys table returns [] to learners.
- Direct XP insert → refused (row-level security). Direct "completed" progress insert on a quiz → refused ("Quiz results are recorded by the server").
- Failed submit → 0%, no XP, no answers or explanations returned.
- Passed submit (×3) → 100%, exactly one 25 XP ledger entry.

## Sign-in and return journey (2026-10-02, browser, preview)
Throwaway account qa-signin-1790956467@fgn.academy (add to cleanup list).
- Signed-out /profile → /auth; sign-up → lands on /profile (sign-up currently signs in immediately; email confirmation is off).
- Sign-in from /work-orders → /work-orders. From /admin (not allowlisted) → /workspace.
- Hostile return values (//evil.example.com, https://evil.example.com/workspace, /learn/../admin) → /workspace.
- Valid server-held intent (/programs) → /programs. Unknown id and malformed id → /workspace (a truly expired id was not tested).
- Server refuses to store /admin or //evil.com intents (HTTP 400).
- Note: /settings?x=1#t landed on /workspace (safe; cause not investigated).

## Production release checks (2026-10-09, https://fgn.academy)
- Publish requested after the 2-hour Studio token lifetime change (backend TTL was already live; this shipped the matching frontend).
- Home and /work-orders: HTTP 200, no page errors.
- Signed in as qa-learner@fgn.academy (minted session): /workspace loads as the signed-in home.
- Work Order detail (pilot f98c218c-2c64-4fde-a1c4-cdfada0658b6): loads; no time estimate shown (time ban holds).
- Skill Passport (signed-in): "Not yet scored" shown, no stray "Verified" badge, Reviewed Demonstrations section present.
- Public Passport page for the same learner: loads.
- /challenges is not a learner route (404 by design); the challenge registry is admin-only at /admin/challenge-registry. Signed FGN.GG challenge completions were already exercised through the webhook path in earlier rounds; no new live delivery was sent this round.
- Security scan at publish time: no unresolved critical findings blocking; two known triaged RLS warnings (tenant_program_offerings, simulation_activity_cache read-all for signed-in users) remain on the triage list.
