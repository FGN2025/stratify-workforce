## Goal
Bring the three in-app Help pages (`/help`, `/help/admin`, `/help/student`) in line with the current state of FGN Academy. The markdown docs in `docs/` are out of scope.

## What's stale today
- **No mention of the two-tier admin model** (Platform Admin vs Community Admin) added in `CommunityAdminRoute`, `CommunitiesAdminTable`, and `CommunitySetup` refactor.
- **Community Setup hub** (Curation, Work Orders, Events, Evidence Review, Reg Codes, Skills Paths) isn't documented.
- **SIM Categories + Default SIM Games** management is missing.
- **Challenge Configurator + Assessments**: `simulations`, `simulation_items`, `simulation_runs`, four archetypes (`sequence`, `loadout`, `resource_selection`, `method_selection`), `attach-assessment-to-workorder`, `score-simulation` are not referenced.
- **Import edge function** (`import-challenge-as-workorder`) — guide still describes the old inline-dialog flow.
- **SIM Industry Hub** (`/sim/:gameTitle`) page isn't mentioned for students.
- **Atlas AI Tutor** (SIM-aware persona) — student guide describes a generic AI tutor.
- **XP-only progress doctrine** — student guide still mentions hours/time-based stats; should be XP-only per project rules.
- **Skill Passport additions** — `/passport/embed`, `/verify`, public passport slug, credential verification hash already partly covered but need a refresh.
- Student guide lists outdated SIM resource statuses ("Coming Soon" for Farming/Construction/Mechanic) — should reference the SIM Industry Hub instead.
- Leaderboard description references "play time" — should be XP/credentials.

## Changes

### 1. `src/pages/HelpAdmin.tsx`
- Update **Role Hierarchy** section: add `community_admin` / community ownership concept; clarify Platform Admin vs Community Admin scope.
- New section **Community Admin Hub** (`/admin/community-setup`): describe the six quick-link cards.
- New section **Communities (Platform Admin)**: `CommunitiesAdminTable` — browse all tenants, "Open as admin" to switch tenant context.
- Update **Work Orders** section to mention SIM Industry assignment, Default SIM Games, SIM Categories admin.
- New section **Challenge Configurator & Assessments**: four archetypes, attach-to-work-order flow.
- Update **Super Admin Features**: keep Tenant Mgmt, Authorized Apps, Audit Logs; note Community Review is platform-only.
- Keep Danger Zone, Evidence Review, Reg Codes, Media Library sections; minor copy tweaks.

### 2. `src/pages/HelpGuide.tsx` (ecosystem / integrations guide)
- Update **Importing Challenges** section to describe the `import-challenge-as-workorder` edge function (admin-gated, batch up to 50, idempotent on `fgn_origin_challenge_id`, preserves `play_source` on insert, upserts `game_channels`, inserts `work_order_tasks`).
- New section **Assessments & Skill Passport recording**: `simulations` / `simulation_items` / `simulation_runs`, four archetypes, `attach-assessment-to-workorder` and `score-simulation` → `sync-challenge-completion` → `ensure_skill_passport`.
- Refresh **Challenge Completion Pipeline** language to mention `fgn_origin_challenge_id` as primary join (keep `source_challenge_id` mention for legacy clarity).
- Keep Breakroom, BBW Sync, Cross-Platform Identity, Credential API sections; refresh code snippets only where field names changed.

### 3. `src/pages/HelpStudent.tsx`
- **Skill Passport** section: drop hours/sessions wording; lead with XP, credentials, badges, employability score.
- **Work Orders**: remove "play.fgn.gg telemetry" phrasing in favor of "completions sync automatically from FGN Play and Breakroom"; mention evidence review states.
- **Leaderboard**: rank by Employability Score + XP only — remove "play time" line.
- **Simulation Resources** → replace with **SIM Industry Hub** section pointing to `/sim/:gameTitle` for curriculum, work orders, careers, credentials per SIM.
- **AI Tutor** → rename to **Atlas (AI Tutor)**, note SIM-aware persona based on current game context.
- New small section **Communities & Registration Codes**: how codes auto-join you to a community.
- Keep Getting Started, Events, Tips sections with minor wording tweaks.

## Out of scope
- `docs/admin-user-guide.md` and other `docs/*.md` runbooks.
- Any behavior changes — pure content refresh of three TSX files.
- Layout/visual restyle of the Help pages.
