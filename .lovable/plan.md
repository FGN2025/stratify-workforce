# Course-sending permission for Studio's API token

## Goal
Let Studio (studio.fgn.gg) submit **courses** through the existing Studio submission pipeline — today its token can only send Work Order packages. The permission is explicit and scoped: course sending is granted separately from Work Order sending, and only to Studio's authorized app.

## Current state (verified)
- Studio tokens are minted in `studio-catalog` (`/studio-token`) with scopes `catalog:read` plus `submissions:create` when the issuing app has `can_submit_packages = true` on `authorized_apps`.
- `studio-submit` requires the `submissions:create` scope and the app's `can_submit_packages` flag; every submission is treated as a Work Order package — on approval it creates an inactive SCORM course **linked to a Work Order** (an existing one, or a draft generated from the manifest).
- There is no content-type field on submissions and no per-type permission.

## Changes

### 1. New permission flag (database)
- Add `can_submit_courses boolean not null default false` to `authorized_apps`.
- Enable it for Studio's authorized app only (owner-approved DML; no other app changes).

### 2. Token minting (`studio-catalog` `/studio-token`)
- When the issuing app has `can_submit_courses`, add a new scope `submissions:create:courses` to the minted token (alongside the existing scopes). Tokens for apps without the flag never carry it.

### 3. Submission gate (`studio-submit`)
- Accept an optional `submissionType` field: `work_order` (default, unchanged behavior) or `course`.
- `submissionType: "course"` requires both the token scope `submissions:create:courses` and the app flag `can_submit_courses`; otherwise return 403 `scope_denied` with a clear message.
- On admin approval of a course submission: create a standalone inactive, unpublished SCORM course (no Work Order link required) in the submission's tenant; human review and the existing publish flow stay mandatory. Work Order submissions are untouched.
- Reject `requestWorkOrderCreation` on course submissions (courses stand alone).

### 4. Contract + docs
- Bump contract to `2026-10-10.3` (additive; older versions still accepted for Work Order submissions).
- Update `openapi.json`, `docs/api/studio-catalog/README.md`, `docs/api/contract-inventory.md`, and the Phase-4 Studio handoff so Darcy's team can implement the new field.

### 5. Admin UI
- `StudioSubmissions` review inbox shows the submission type (Course / Work Order) so reviewers know what they're approving.

## Verification
- Token without the course scope submitting `submissionType: "course"` → 403.
- Studio's token (flag enabled) submitting a course → accepted, appears in Review Inbox as a Course.
- Approving it creates an inactive, unpublished SCORM course with no XP/credential side effects.
- Work Order submissions and the existing contract versions behave exactly as before (regression check).

## Out of scope
- No changes to FGN.GG, Merits, Maritime, Sim Racing, or Railroading.
- No automatic publishing — a person still publishes every course.
- Studio-side UI work (Darcy's team) is handoff, not this build.
