# Response to the Second External Review

## Assessment
The review is accurate and fair. It confirms the foundational work (public/workspace split, branding, program registry, readiness checks, contract inventory, award guards, shadow mode, origin tracking). Its remaining findings fall into three groups:

1. Integration safety (P0): lenient signing on the general receiver, failed deliveries blocked by "duplicate", incomplete identity recovery, an over-optimistic health dashboard, and the unfinished regression suite.
2. Honesty of what learners see: Skill Passport placeholder scores (50s, hard-coded org average), one catch-all credential group, broad "certification/career-ready" claims.
3. Unfinished product work: homepage program entries, pathway display, action-first Workspace, full return-path through login, Join opening sign-up, logo, admin screens, points interface, Merits outbox review, Construction pilot.

The review correctly treats the Racing/Railroading/Maritime/Merits pilots as deferred, not failed. Those programs will be labelled "integration pending." One fact changed since the review: Broadband Workforce is now an independent sub-site with no Academy connection, so it drops out of receiver scope.

## Stage 1 — Secure and recover integrations (P0)
1. **Strict signing everywhere that affects learners.** The general receiver requires a valid signature for any source that can produce learner outcomes, whatever the source's lenient flag says. Lenient sources become record-only (logged, no outcome), the same way shadow mode works. Set Play to strict after a check that current Play traffic signs correctly. Check the retired or unused entry points and turn each one off or make it record-only.
2. **Failed deliveries can retry.** Receivers return a non-2xx status when downstream processing fails. A repeated delivery ID counts as "duplicate" only when the earlier attempt completed. Failed attempts get processed again against the same record, and credential/XP uniqueness keeps the outcome to exactly one.
3. **Identity recovery for every case.** Unknown-learner `challenge.completed` events go into the source-aware retry queue. Linking a partner account (Discord/Play link, passport link) triggers a replay, the same as signup does today.
4. **Partner evidence per Decision 4.** Replace the 501 with record-only intake: store it as supporting evidence, with no credential and no XP. The award-flow guard stays as the backstop. Update the inventory so it no longer says "pending."
5. **Honest health dashboard.** Use five states: Not connected, Untested, Healthy, Degraded, Failed. A program with no successful delivery can never show Healthy. Include task-level deliveries, failed and dead events, and each receiver's actual signing status, and surface query errors instead of hiding them.
6. **Regression suite (A4).** Script and run against the deployed endpoints: missing, invalid and valid signatures on each receiver; duplicate completion; out-of-order events; transient failure followed by retry giving one outcome; unknown learner who then signs up or links, giving one credential, with a second replay creating nothing; cross-organization submission refused; withdrawn evidence; outage and backoff. Record actual results separately from planned ones.

## Stage 2 — Make the Skill Passport truthful
- Show "Not assessed" wherever evidence is missing. Remove the 50-point fallbacks and the employability 50.0. Remove the hard-coded organization average, or calculate it only from data the viewer is authorized to see.
- Four outcome sections, each showing source and issuer: Participation, Reviewed demonstrations, FGN educational merits, Organization-issued achievements.
- Rewrite claims so each matches its evidence and issuer. Simulation progress is labelled as progress, not qualification. No broad "certified" or "career-ready" wording.

## Stage 3 — Learner journey and discovery
- Homepage: flagship program cards, plus a choice between "On my own" and "Through my organization." Programs with no proven journey show "Integration pending."
- Program detail pages list their connected learning pathways, starting by linking Construction content to Heavy Equipment.
- Workspace order: evidence to submit, then feedback needing action, then progress by program, then the rest.
- Keep the full destination (path, query and fragment) and the approved program context through sign-in, sign-up and email confirmation. Cross-site program links carry an approved return address.
- "Join" opens sign-up directly and keeps a link to sign in.
- Replace the old gold logo with the approved FGN logo plus an "Academy" descriptor. This needs the logo file from you.

## Stage 4 — Admin and points
- Platform-admin program editor. Community-admin screen for choosing their organization's program offerings and scheduling.
- Points: balance display, redemption request, and admin approval, kept visibly separate from XP and qualifications.

## Stage 5 — Construction pilot (Excavation & Trenching)
Run the full journey: complete the activity, submit evidence, reviewer decides, Passport entry appears, points are earned once, and a pathway-step redemption is fulfilled. Write up the results for review before extending to any other program.

## Stage 6 — Merits outbox review (read-only)
Document issuer attribution, requirement versions, corrections, revocations and receiver compatibility for Merits. No changes to the Merits project.

## Still outside Academy
Shared sign-in for the Workforce map is a change in that project. It is tracked as a follow-up and not claimed here.

## Technical details
- `learning-source-webhook`: a failed signature with `strict_mode=false` sets status `record_only` and skips dispatch. HTTP status mirrors dispatch failures (5xx on failure). The idempotency lookup matches only `status in ('completed','shadow','record_only','unmapped')`, and failed rows are updated in place.
- `sync-challenge-completion` unmapped path inserts into `play_replay_queue` with `source_slug`. A trigger or hook on identity-link tables enqueues a replay through `process-play-replay-queue`.
- `evidence.approved` writes a supporting-evidence row with `award_pathway` semantics blocked by the existing guard.
- `integration-health` state is computed from last success, failures and dead-letter counts, deliveries with no completion ID are attributed through the task's work order, and every query error is returned per row.
- `ProtectedRoute` passes `pathname+search+hash`. Auth reads `mode=signup`. Return targets are validated against the registry's canonical URLs.
- The suite is a Deno script under `docs/external-review/` with results appended to `stage-b-tests.md`.
- Update `contract-inventory.md` to version 2026-10-01.2, and update the roadmap.
