
# SIM-as-Spine: Industry-Aware Learning Layer

Today `game_title` is a tag used for filtering. This plan promotes it to the **organizing spine** of the platform, so each SIM (Trucking, Construction, Fiber-Tech, etc.) becomes a coherent industry pathway: subscribe → train → work → credential → career.

## Goals

1. Every learning artifact (course, career path) can declare its SIM directly — not via inference through a work order.
2. A learner can land on a single page per SIM and see everything: channel, courses, work orders, resources, credentials they've earned, careers they're approaching.
3. The Skill Passport pivots by SIM so readiness is legible per industry.
4. Admins curate per-SIM content without touching code.

## Scope (3 phases)

### Phase 1 — Anchor content to SIMs (data model)

Add first-class `game_title` to learning content so we stop inferring it.

- `courses.game_title` (nullable enum) — primary SIM the course belongs to.
- `career_paths.game_title` is already nullable; backfill it and start requiring it for new paths.
- Backfill `courses.game_title` from the dominant `lessons.work_order_id → work_orders.game_title` of its lessons. Manual override for ambiguous courses.
- Admin: add a SIM selector to the Course Builder.
- No change to `work_orders` / `sim_resources` / `game_channels` — already keyed by `game_title`.

### Phase 2 — SIM Industry pages (`/sim/:gameTitle`)

One canonical landing page per SIM, replacing the per-game ATS deep-dive logic that's currently hard-coded into `/work-orders`.

Page composition (top to bottom, all `HorizontalCarousel`):

1. **SIM Hero** — channel cover, accent color, subscribe button, member count, brief industry description.
2. **Curriculum** — `courses` filtered by `game_title`, with enrollment status.
3. **Active Work Orders** — `work_orders` filtered by `game_title`, with completion state.
4. **Career Paths in this Industry** — `career_paths` filtered by `game_title`, each showing the user's `calculate_readiness()` percentage.
5. **Credentials You Can Earn** — `credential_types` filtered by `game_title`.
6. **External Resources** — `sim_resources` filtered by `game_title` (replaces the static `config/simResources.ts` ATS Deep Dive).
7. **Leaderboard** — top performers in this SIM (existing leaderboard, scoped).

Routing:
- `/sim/:gameTitle` (e.g. `/sim/Construction_Sim`).
- Sidebar: add a "Simulators" group that lists each enabled SIM.
- Existing `/work-orders` keeps its cross-SIM filtered view; per-SIM deep-dive moves to `/sim/:gameTitle`.

Behavior:
- SIMs with sparse content (Farming, Mechanic) still render the page with empty-state messaging per section ("First Construction course coming soon"). Honors existing content-staging memory: hide CTAs for unmapped sections instead of broken links.

### Phase 3 — Passport pivots by SIM

Today the passport is a flat credential list. Make it SIM-aware.

- Profile / Passport page: add a SIM filter row (chips with channel accent colors) above the credential grid.
- New "Industry Readiness" panel using `calculate_readiness()` grouped by SIM, showing a bar per active SIM (active = has subscription, work-order progress, or credential).
- Public passport (`/passport/:slug`) gets the same SIM filter so external viewers (employers) can scope to one industry.

## Out of scope (now)

- Many-to-many courses↔SIMs. Single `game_title` per course is enough today; revisit if a course legitimately spans two industries.
- Reworking `game_channels`. Channels stay as-is (subscription + accent color source of truth per memory).
- Tenant-specific SIM curation. Industry pages are global; tenant scoping can layer on later via existing `tenant_id` filters on courses/work orders.

## Risks / decisions to confirm

- **Course → SIM cardinality.** Going single-valued. Confirm no cross-industry courses exist that need both tags.
- **Static vs DB sim resources.** Plan deletes `src/config/simResources.ts` ATS-only block in favor of `sim_resources` table. Need to ensure DB rows are seeded for ATS to avoid regression on `/work-orders`.
- **Empty SIMs.** Five of six SIMs are sparse. Empty-state copy needs to feel intentional, not broken.

## Technical details

- Migration: `ALTER TABLE public.courses ADD COLUMN game_title public.game_title;` plus an index. No RLS change needed (existing policies remain).
- Backfill SQL: derive course `game_title` from majority `work_orders.game_title` via `lessons.work_order_id`; null where unknown.
- New hook: `useSimOverview(gameTitle)` — single React Query that parallel-fetches courses, work orders, career paths with readiness, credential types, sim resources, and channel meta for one SIM.
- New page: `src/pages/SimIndustry.tsx` + route in `App.tsx`.
- Admin: extend `CourseBuilder.tsx` with a `Select` for `game_title` (use `'none'` sentinel per memory).
- Passport pivot: extend `PublicPassport.tsx` and `Profile.tsx` with a `gameTitle` state + filter; reuse channel accent colors via `useGameChannelColors`.
- Sidebar: extend `AppSidebar.tsx` "Simulators" group, iterating `game_channels`.

## Suggested sequencing

1. Migration + course backfill + Course Builder selector.
2. `/sim/:gameTitle` page with read-only sections.
3. Passport SIM filter + Industry Readiness panel.
4. Retire the static `simResources.ts` ATS block once the DB-driven path is verified.
