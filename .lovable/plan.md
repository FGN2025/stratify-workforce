# Studio → Academy course submissions (Phase 4)

Today Course Builder and studio.fgn.gg are parallel systems: Course Builder generates SCORM internally via `scorm-build`; Studio only *reads* the Work Order catalog through the read-only `studio-catalog` API. This plan opens the reverse path: Studio authors a package, submits it to Academy, an Academy admin reviews and activates it.

## What we'll build

### 1. Submission endpoint (`studio-submit` edge function)
- New function accepting Studio package submissions (SCORM 1.2/2004 ZIP, or manifest + asset references).
- Auth reuses the existing Studio token model: short-lived `studio_tokens` with a new `submissions:create` scope, minted server-to-server via the durable operator key; browser origin restricted to `https://studio.fgn.gg` (registered on the issuing app in `authorized_apps.allowed_origins`). Unregistered origins get 403, missing token 401 — same fail-closed posture as the catalog API.
- Submissions are stored to a private storage bucket; the package is never public.

### 2. Submission records (`studio_submissions` table)
- Columns: id, studio app id, package storage path, title/description, SCORM version, source Work Order ids, validation status, review status (pending / approved / rejected / needs_revision), reviewer, review note, linked `scorm_courses` id, timestamps.
- GRANTs + RLS: platform admins only; Studio itself never reads the table — it polls a status route instead.

### 3. Validation on receipt
- Parse the SCORM manifest, check size/count limits, required metadata, and the fail-closed Studio vocabulary.
- Invalid packages are marked `validation_failed` with a machine-readable reason; nothing reaches reviewers.

### 4. Admin review inbox
- New "Studio Submissions" panel in the Admin Dashboard (next to Course Builder): list pending submissions, preview manifest metadata, approve / reject / request revision with a note.
- Approval converts the submission into a `scorm_courses` row via the existing `upsert_scorm_course_bundle` RPC — created **inactive/unpublished**, matching Studio's own principle that nothing goes live until a person activates it at the destination. Publication then follows the existing SCORM publish flow and Work Order publication-readiness checks.

### 5. Status route for Studio
- `GET /studio-submit/status/:id` (token-scoped) returns validation + review state so Studio can poll — consistent with our pull-model contract; no outbound push to Studio in this phase.

### 6. Work Order generation from external systems
- Preserve and generalize the existing external-to-Work-Order path (today: `import-challenge-as-workorder` for play.fgn.gg and the learning-source webhook/pull pipelines).
- A submission can optionally request Work Order creation: on approval, the package's manifest metadata (title, objectives, activities) is used to generate draft Work Orders — inactive until an admin completes publication-readiness checks, same as every other publishing path.
- The mapping is source-agnostic (SCORM manifest today; other LMS package formats can register their own parser later), so future LMS integrations reuse the same inbox, validation, and review flow rather than new one-off pipelines.

### 7. Contract & docs
- New contract version (e.g. `2026-10-10.1`) documented in `docs/api/contract-inventory.md`, the studio-catalog README/OpenAPI, and the Phase 3 handoff doc (marked Phase 4 opened).
- Signing-secret requirement, token lifetime (2h), revocation, and error codes documented identically in all three places.

## Standing constraints (unchanged)
- Decision 4: Studio submissions are content only — no credential, XP, or points are awarded by submission or approval.
- No changes to FGN.GG, Merits, Maritime, Sim Racing, or Railroading sites.
- XP/credits remain server-side only; the time-estimate ban and Course/Lesson vocabulary rules apply to any UI.
- Secrets (signing key) requested via the secure secret form, never in code or docs.

## Validation checklist
- Submit a valid package with a Studio token → appears in the admin inbox as pending.
- Submit without a token / from an unapproved origin → 401 / 403.
- Submit an invalid manifest → `validation_failed` with reason; not visible to reviewers.
- Approve → inactive `scorm_courses` row exists; publish flow works; learner cannot see it until published.
- Reject with note → Studio status route reflects it.
- Duplicate submission of the same package → acknowledged without a second record.
