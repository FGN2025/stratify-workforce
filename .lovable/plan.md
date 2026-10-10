# Phase 4 Studio handoff document — package submissions

Darcy (darcy@fgn.gg), who builds the Studio side, needs a single document he can work from: the Phase 4 submission path is live on Academy, and the Studio-side work (token minting, submitting packages, polling status) has no consolidated handoff yet. Today the Phase 4 contract only lives inside `docs/api/studio-catalog/README.md` (mixed in with the Phase 3 read API) and as a short update note in `docs/phase-3-studio-handoff.md`.

## What we'll produce

A new document, `docs/phase-4-studio-submissions-handoff.md`, written for the Studio developer as a standalone brief — everything needed to build the Studio side without reading Academy's other docs — plus a copy placed in Files so it can be sent to Darcy directly. Same no-credential rule as the Phase 3 handoff: no key, token or secret appears in the document, chat, or repo.

## Document contents

1. **Overview.** Studio authors a package and submits it to Academy; an Academy platform admin reviews it; nothing goes live without human approval. Decision 4 restated: submissions are content only — no credential, XP or points awarded by submission or approval.
2. **Two credentials, same as Phase 3.** Durable operator key (proxy-only, never accepted on a submission route) → exchanged at `POST /studio-token` server-to-server for a 2-hour bearer token that now carries `submissions:create` alongside `catalog:read` (the Studio app is provisioned with `can_submit_packages`). Durable keys sent as Bearer are refused `401 credential_invalid`.
3. **Contract header.** `X-Studio-Contract: 2026-10-10.1` required on all submission routes (`2026-09-23.1` still accepted).
4. **Submission endpoint.** `POST /studio-submit/submissions` with full request schema: `idempotencyKey` (required, ≤200 chars), `title` (required, ≤200 chars), `description`, `scormVersion` (`1.2`|`2004`), `packageBase64` (ZIP, base64), `sourceWorkOrderIds[]`, `requestWorkOrderCreation`, `gameTitle`. Response examples for 201, 200 duplicate, and the validation path.
5. **Package rules.** ZIP with `imsmanifest.xml` at the root, max 25 MB decoded; packages stored in a private bucket, never public; validation is fail-closed — a bad package is `validation_failed` with readable reasons and never reaches reviewers.
6. **Work Order creation option.** `requestWorkOrderCreation: true` requires `gameTitle` from the Studio vocabulary (ATS, Farming_Sim, Construction_Sim, Mechanic_Sim, Fiber_Tech, Roadcraft, MSFS_2024, House_Flipper, House_Flipper_2, Electrician_Sim); on approval a draft Work Order is created inactive until publication-readiness checks pass.
7. **Status polling.** `GET /studio-submit/status/:submissionId` — token-scoped; an app only ever sees its own submissions; pull model, Academy never pushes status outbound. Polling guidance (retry on transient failures; 2-hour token TTL means the proxy may need to re-mint mid-poll).
8. **Review lifecycle.** States pending → approved / rejected / needs_revision with an optional reviewer note returned in the status payload. Approval creates an **inactive** SCORM course (and optional inactive draft Work Order) — publication is a separate human step in Academy. Second review of an already-reviewed submission is refused.
9. **Error catalogue.** `401 credential_absent|invalid|expired|revoked`, `403 scope_denied|forbidden_origin`, `400 contract_version_mismatch|invalid_request`, `404 not_found`, `405 method_not_allowed`, `409 already_reviewed|validation_incomplete|game_title_required`, `413 package_too_large`. Origin rules: browser calls only from `https://studio.fgn.gg` (registered); server-to-server calls send no Origin.
10. **Secret exchange procedure.** The operator key is issued out-of-band through the secure secret form, never in chat or docs; named administrators (Jake_Trucker, backup MJ) handle issuance and revocation; worst-case exposure window 2 hours.
11. **What Studio builds + acceptance checklist.** Mint tokens via the proxy, submit a real package, poll status, handle duplicates idempotently, and a joint end-to-end test: valid package → pending in the admin inbox; no token → 401; unapproved origin → 403; invalid manifest → validation_failed; reject with note visible in status; duplicate → acknowledged without a second record.

## Cross-references kept consistent

- Add a pointer from `docs/phase-3-studio-handoff.md` and `docs/api/studio-catalog/README.md` ("Package submissions" section) to the new handoff document, so all three stay aligned and no contract detail is stated differently in two places.

## Technical notes

- Endpoint facts are taken from the deployed `supabase/functions/studio-submit/index.ts` and the README; no contract changes — documentation only.
- Deliverable copies: `docs/phase-4-studio-submissions-handoff.md` (repo) and `Phase-4-Studio-Submissions-Handoff.md` (Files, for sending to Darcy).
