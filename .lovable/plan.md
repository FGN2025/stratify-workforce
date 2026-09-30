# Close the remaining release gates

Status to record: integration hardening substantially verified; learner acceptance and release verification pending.

## 1. Release coordination (first)
- List every database change from the last round that the currently published app depends on or conflicts with (post-sign-in reference, redemption, pilot reward, passport score fields).
- Write a short release note with rollback steps (which frontend version to restore, which database pieces are additive and safe to leave).
- Publish the matching frontend, then smoke-test: sign-in, Work Orders list/detail, Skill Passport (signed-in + public), and a signed FGN.GG challenge completion through the existing path.

## 2. Two clarifications
- Duplicate deliveries: document and re-test live. Completed duplicate returns 200 with the original outcome and no new result; in-progress duplicate returns 409 with a Retry-After header (to add) meaning "retry later, same delivery ID". Record the observed codes for the 6-way concurrent test in the stage test report and contract inventory.
- Signed-in Passport: audit Profile, header, skill radar, and outcome sections. Score already shows "Not yet scored"; the organization average only renders with real data — confirm no hard-coded fallback exists, and correct outcome categories and "qualified" wording to match the public Passport (reviewed / supporting / catalogued).

## 3. Points redemption acceptance
- Create a test learner with a known credit balance via a controlled admin grant.
- Fire two simultaneous redemptions whose combined cost exceeds the balance: exactly one succeeds.
- Repeat an identical request (same idempotency key): one debit only. Add an idempotency key to redemption requests if missing.
- Admin refund: one reversal entry; a second refund attempt is refused.

## 4. Construction pilot journey
- Learner completes Excavation & Trenching tasks with evidence; a reviewer accepts.
- Verify: Passport updates, pilot points issue once, re-review issues nothing, XP and credentials unchanged, and an eligible pathway redemption completes.

## 5. Sign-in and return journey (browser)
- Playwright: login, signup, and email-confirmation returns land on approved destinations.
- Expired reference (>30 min) and unapproved destinations fall back to Workspace; no tokens appear in addresses.

## 6. Merits compatibility review (read-only)
- Review issuer authority, requirement versions, corrections, revocations, and receiver compatibility; publish findings before finalizing organization-achievement terms. No writes to Merits.

## 7. Scanner triage (117 warnings)
- Classify each: public access, tenant isolation, credentials, evidence, points first; fix real issues, record intentional ones (learner-callable redemption, anonymous return reference) with the server-side checks that protect them. No blanket dismissal.

## Technical details
- Webhook duplicate path: learning-source-webhook returns 200 (completed) or 409 (in-flight); add `Retry-After`.
- redeem_points: add optional `p_request_key` with unique index on (user_id, request_key) if not present.
- Results appended to docs/external-review/stage-a-tests.md; contract inventory bumped if response headers change.
