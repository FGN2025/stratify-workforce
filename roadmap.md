# Roadmap — Phase 1B: Canonical Simulation Activity identity

## Public Academy branding (2026-09-30)

- [x] Present FGN Academy as the product brand on signed-out pages
- [x] Reduce signed-out navigation to Discover, Learn, and Communities
- [x] Keep organization identity and selection inside the signed-in account menu
- [x] Verify signed-out desktop/mobile presentation and signed-in organization context

## Public discovery and learner workspace (2026-09-30)

- [x] Give signed-out visitors a dedicated Course-focused public experience without the application sidebar
- [x] Add a signed-in workspace overview for Courses, Work Orders, XP, Skill Passport progress, and upcoming activity
- [x] Route sign-in and product-home actions to the correct public or workspace destination
- [x] Verify signed-out and signed-in experiences on desktop and mobile

## Work Order publication readiness (2026-09-30)

- [x] Block publication without a meaningful title, summary, image, and usable task briefs
- [x] Return the missing requirements from every admin activation path
- [x] Allow meaningful Work Order and task titles to wrap
- [x] Verify the signed-in workspace on desktop and mobile

- [x] Step 1 — Discover live FGN.GG contract (probe + `docs/api/integration-guides/gg-simulation-activity-contract.md`)
- [x] Step 2 — `work_orders.simulation_activity_id` (uuid, nullable, no FK) + disposable `simulation_activity_cache`
- [x] Step 3 — Carry canonical id through `import-challenge-as-workorder`; completion sync validates provenance only
- [x] Step 4 — Reconciliation staging table + proposal run (no writes to `work_orders` without approval)
- [x] Step 5 — Admin Activity Mapping Console
- [x] Step 6 — Five Golden Paths reconciliation report (`docs/golden-paths-reconciliation.md`)
- [x] Step 7 — Skills/evidence findings (`docs/golden-paths-skills-evidence-findings.md`)
- [x] Step 8 — Health check extensions + regression pass; checkpoint summary in `docs/phase-1b-checkpoint-summary.md`

## Checkpoint decisions (applied 2026-09-22)

- [x] Approve MSFS Preflight Aircraft Inspection mapping only (`eff75523-…` → `b12e6fe2-…`), identity column only
- [x] Hold both Excavation and Trenching Work Orders in review — duplicate educational record, nothing minted or retired
- [x] Preserve the Conduit Placement and Backfill duplication as a recorded pending-review item
- [x] Console: `ACCEPTED_MULTI_INTERPRETATION` resolved state, shared activity as observation, grouped view + accept action
- [x] Record the three GG-only Golden Paths as GG ONLY — ACADEMY WORK ORDER NOT YET AUTHORED (none created)
- [x] Phase 2 revised architecture written to `docs/phase-2-evidence-skills-architecture.md`

Broad catalog migration remains withheld. No Phase 2 tables have been created —
implementation of the Evidence + Skills model awaits an explicit build instruction.

# Phase 2D — Skills governance + staged migration (review gate reached)

- [x] Resolve the six needs_review canonical skills (aliases preserved, no generic Documentation skill)
- [x] Seven new canonical skills for civil earthworks / underground infrastructure
- [x] Maturity model: `work_order_migration_maturity` + `work_order_migration_readiness` (approval-only promotion)
- [x] Excavation and Trenching: one canonical activity, two valid interpretations (Construction + Fiber)
- [x] Controlled non-admin learner test per interpretation; 16 v2_fit_weighted signals, shared provenance
- [x] Structured-evidence artifact kind defect fixed
- [x] Admin migration maturity + industry rollout views in the Activity Mapping console
- [x] Security/RLS regression (learner, reviewer, cross-community admin, signed out)
- [x] A–M report in `docs/phase-2d-build-report.md`
- [ ] AWAITING APPROVAL — no further industry migration until the review gate is cleared

# Phase 3 prep — FGN Studio read-only catalog contract

- [x] Scope confirmed by owner: FGN Global `efd28c29-…`, descendants disabled, read-only
- [ ] Corrections: CORS/discovery exceptions, scope-filtered visibility metadata, scope-bound cursors with safe retries, authenticated proxy token delivery
- [ ] Handoff doc: exact API + OpenAPI URLs, deployment status, real test results, remaining Studio steps
- [ ] Short-lived tenant-scoped Studio tokens (expiry + revocation documented); durable app key stays operator-side
- [ ] `studio-catalog` read API: /capabilities, /skills, /work-order-relationships, /vocabulary, /sources
- [ ] All maturity levels incl. null/unclassified + Academy-native retrievable without an activityIds filter
- [ ] Visibility/curation reported separately from maturity (or declared unsupported)
- [ ] Explicit versions on every response; stale-read + concurrent-pagination semantics documented
- [ ] Vocabulary versioning/invalidation, fail-closed on unknown constraint formats
- [ ] Public OpenAPI doc, approved-origin CORS, contract-version mismatch response
- [ ] Pre-handoff verification suite; completed vs planned clearly distinguished
- [ ] Read-only; Studio approvals simulated; Phase 4 (writes) blocked

## Phase 3 prep — Studio catalog read API (2026-09-23)
- [x] Scope confirmed: FGN Global efd28c29-…, descendants off, read-only, all maturity levels incl. unclassified
- [x] Four corrections built: CORS/discovery exceptions, tenant-filtered curation metadata, scope-bound idempotent cursors, proxy-only short-lived tokens
- [x] Full pre-handoff verification suite executed against the deployed endpoint (27 checks)
- [x] Docs: docs/api/studio-catalog/README.md, docs/openapi/studio-catalog.yaml, docs/phase-3-studio-handoff.md
- [ ] Register Studio's browser origin(s) + issue operator key out-of-band (blocked: awaiting Studio's proxy/origin details)
- [ ] Admin UI for catalog-read scope + token revoke list (server-side administration only today)

## Programs, learning and organization navigation (2026-09-30)
- [x] Program registry tables (programs, program_games, program_pathways, tenant_program_offerings) with platform-admin writes and community-admin offerings
- [x] Public read-only `program-registry` feed (contract 2026-09-30.1)
- [x] Public /programs directory and /programs/:key pages; header link
- [x] Signed-in sidebar grouped: Explore programs / My learning / My organization
- [ ] Admin screen for editing registry entries (platform admin)
- [ ] Community-admin screen to turn programs on for their organization
- [ ] Link Courses/Work Orders to programs (program_pathways is empty)
- [ ] Assessment doc: registry vs each live site (capabilities marked "unverified" until checked)
- [ ] railway.fgn.gg does not resolve yet (blocked: DNS owner); railway.fgn.academy responds and is recorded as legacy
