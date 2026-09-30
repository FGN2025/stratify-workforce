# Program, learning, and organization navigation + program registry

## Goal
Split Academy navigation into three separate ideas, each with its own selector and rules:

- **Explore programs** — Racing, Railroading, Maritime, Scout Merits, and the existing trades (trucking, farming, construction, fiber, and others).
- **My learning** — continue an assignment, submit evidence, review feedback, view the Skill Passport.
- **My organization** — membership, assigned work, cohort activity, and administration the person is authorized for.

Picking a program is a browsing choice. Picking an organization changes account context. The two are never linked: switching from Maritime to Racing changes what you are looking at, not your organization, roles, or access.

## 1. Program registry (assessment + first version)
One configurable list of programs that drives Academy's program directory and the shared navigation across verticals.

Fields for each program:
- Name, short name, and a stable program key
- Canonical URL, plus legacy URLs to redirect
- Branding: logo, accent color, tagline (inside FGN's locked pillar palette)
- Availability: live, preview, coming soon, or hidden
- Supported games (linked to the existing game list)
- Learning pathways (linked Courses and Work Order tracks)
- Integration capabilities: shared sign-in, Skill Passport, evidence inbound, progress outbound, credential issuance
- Owner (responsible team or person) and contact

Assessment deliverable: a short document that compares the registry with what each site actually runs today. It covers where the sites overlap, gaps, and which fields each site can use now. No capability is marked supported until it has been checked against the live site.

## 2. Canonical destinations and naming
- Initial registry entries: merits.fgn.academy, maritime.fgn.academy, simracing.fgn.academy, railway.fgn.academy.
- **Railroading vs railway:** one canonical address and one display name. Recommended: address `railway.fgn.academy` (it already exists), display name "Railroading" (matches earlier wording). The owner confirms the final choice.
- Old links redirect to the canonical address only where FGN controls the domain. Uncontrolled links are listed, not assumed.
- Each redirect is recorded in the registry (legacy URL → canonical URL).

## 3. Navigation in Academy
- **Public site:** add a "Programs" directory page and a header entry, both driven by the registry. Only live and preview programs show; coming-soon programs are labelled as such. Courses stay the main public discovery path.
- **Signed-in:** the sidebar is grouped into three sections:
  - Explore programs (the program selector)
  - My learning: Workspace, Assignments, Evidence and feedback, Skill Passport
  - My organization: Membership, Assigned work, Cohort activity, Administration (by role)
- The organization selector stays in the account menu. The program selector sits in the Explore section and never touches organization or role state.
- Leaving for an external program site opens its canonical address and states clearly that you are going to another FGN site.

## 4. Shared across verticals (no consolidation yet)
- Every site stays independently deployable, with its own repo and its own database.
- Shared first: a published, versioned registry feed (read-only) that sites can use for cross-site navigation; a shared vocabulary (programs, pathways, Work Orders, evidence); reusable header and program-switcher designs.
- Repository or database consolidation is out of scope until the shared contracts have proven stable.

## Technical details
- New `programs` table (with GRANTs and RLS: public read of live/preview rows through a `public_programs` view, admin-only writes), seeded with the four sites plus the existing trades mapped from `game_channels`.
- Admin screen to edit registry entries, following the existing admin pattern.
- A read-only `program-registry` endpoint returns a versioned JSON feed, and an entry is added to the contract inventory.
- Program selection is kept in page state or the address bar only, never in `user_active_tenant` or `TenantContext`. The organization switcher and tenant-scoped access checks stay unchanged.
- Sidebar regrouping is done in `AppSidebar.tsx`. New `/programs` and `/programs/:key` pages go in the public layout.
- AGENTS.md rule: "Program selection is independent of tenant context; the registry is the single source for cross-vertical navigation."

## Verification
- Switching programs leaves the active organization and roles the same (checked in the browser and against stored data).
- The public directory shows only live and preview programs; the admin screen can change availability.
- The registry feed is versioned and readable without sign-in; writes are refused for non-admins.
- Redirects are tested only on controlled domains, and results are reported separately from planned checks.

## Open decisions for the owner
1. Final Railroading address and display name.
2. Owner for each program entry.
3. Which trades appear as their own programs and which stay grouped under Academy.

## Out of scope
No changes to the code or data of Merits, Maritime, Sim Racing, Railway, or FGN.GG. No tenant ID, permission, or data consolidation.
