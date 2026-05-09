## Context

Today the Breakroom integration is **admin-only**: identity linking (`BreakroomUsersTab`), the new `BreakroomMapperManager`, and back-end poll/sync functions. Students get **no visible signal** that Breakroom exists, that their spatial work counts, or how it relates to play.fgn.gg. Breakroom is the *enrichment layer* that turns a sim challenge into a verified spatial task feeding the Skill Passport — that story is invisible to learners and to anyone reviewing a passport.

Below is a prioritized menu of UX improvements. Pick what to ship; nothing here is a database/back-end refactor — most are presentation + a couple of small read-side hooks.

---

## Tier 1 — Make Breakroom visible to students (highest leverage)

### 1A. "Spatial Task" badge on Work Order cards & detail
When a work order has `metadata.breakroom_course_name` (or any `breakroom_*` mapping), show a small **"Spatial Task — Breakroom"** chip next to the existing play.fgn.gg / SCORM badges on:
- `WorkOrderCard` (dashboard + marketplace)
- `WorkOrderDetail` header
- `EnrolledCourses` lesson rows when the lesson's WO is Breakroom-enriched

Tooltip: *"This challenge has a metaverse extension in Breakroom. Completing it there awards XP + Skill Passport credit."*

### 1B. "Open in Breakroom" CTA on Work Order Detail
Mirror the existing "Play on play.fgn.gg" button. Two states:
- **Identity linked** (`breakroom_identity` exists for the user) → launch button to `curator.sine.space` (or the specific room URL stored in WO metadata).
- **Not linked** → "Connect your Breakroom account" CTA that opens a small dialog explaining how to link (admin-assisted today; eventually self-serve — see Tier 3).

### 1C. Recent Spatial Completions feed on Profile
A new section on `Profile` (and PublicPassport) titled **"Spatial Verifications"** that lists the latest `breakroom_sync_attempts` with `sync_outcome = 'completed'` for the viewing user. Each row: quiz name → matched Work Order → XP awarded → "verified in Breakroom" badge with timestamp. This is the user-visible proof that the loop closed.

---

## Tier 2 — Close the feedback loop (real-time + clarity)

### 2A. Toast / notification when a Breakroom completion lands
Reuse `useNotifications`. When `breakroom-lms-sync` writes a completion, also insert a notification row (`type: 'spatial_verification'`). Student sees:
> "✅ Spatial task verified — *ASE A1 Engine Repair* — +100 XP added to your Skill Passport."

This converts a silent 15-min poll into a delightful in-app moment.

### 2B. Source attribution on Skill Passport credentials
Credentials already track `source` (e.g., `module_milestone`, `course_completion`). Add display logic so credentials that originated from a Breakroom sync show a **"Verified in Breakroom"** ribbon vs. play.fgn.gg's existing chip. Same component (`CertificationCard` / `AchievementCard`), one new variant.

### 2C. "How verification works" explainer
Tiny component on Work Order Detail and Skill Passport: a 3-step diagram —
`play.fgn.gg → Breakroom (spatial task) → Skill Passport`
— making the bridge role of Academy explicit. Static content, helps onboarding.

---

## Tier 3 — Reduce admin toil & user friction

### 3A. Self-serve Breakroom identity linking
Today admins link `breakroom_username` ↔ FGN user via `BreakroomUsersTab`. Add a **Settings → Connections** card next to Discord:
- User enters their Breakroom username.
- Edge function verifies it exists in Breakroom API.
- Writes `breakroom_identity` with a `verification_status = 'pending_admin_review'` flag (to prevent identity hijack), or auto-approves if the email returned by Breakroom matches the FGN account email.

### 3B. Admin "Suggested mappings" in the Mapper page
Extend `BreakroomMapperManager` with a fuzzy-match suggestion column: for each unmapped quiz, show top 3 work orders ranked by title similarity (Levenshtein on quiz name vs. WO title) so admins can one-click instead of searching. Pure client-side compute on existing data.

### 3C. Bulk reset & retry filters
`BreakroomMapperManager` already lets admins reset one row. Add: filter by outcome, multi-select, bulk reset. Useful after a bulk mapping pass.

---

## Tier 4 — Telemetry & trust

### 4A. Public passport: spatial verification counter
On `PublicPassport` / `EmbedPassport`, show a stat: *"N spatial tasks verified in Breakroom"*. Reinforces that the passport is multi-source (not just sim playtime).

### 4B. Audit log surfacing for admins
Add `skipped_unmapped` and `synced` counters to the existing audit-log view (`useAuditLogs`) with a Breakroom filter. Already discussed earlier, still pending.

### 4C. Health badge for Breakroom session tokens
Tiny indicator in Admin → Breakroom Mapper header: green if last poll succeeded with `students_found > 0`, amber if 0 students, red if 401/403. Saves the "is the token expired?" debugging round-trip.

---

## Recommended first slice

If you want a single, cohesive ship that *immediately* improves student UX:

> **Tier 1 (1A + 1B + 1C) + Tier 2A.**
> Students see the spatial task exists, can launch it, get notified when it completes, and see it on their profile. ~4 small frontend components + 1 small notification insert in `breakroom-lms-sync`.

Tier 3 is the next-best chunk (admin sanity + self-serve linking) and unblocks scale beyond Darcy/RacerX.

---

## Decision needed

Which tier(s) do you want me to plan in detail for implementation? Recommend confirming the **first slice above** or picking a different combination.