# Program, learning, and organization navigation + program registry

## Recommended architecture: separate layers, freely combined
Games, trades, industries, programs, and organizations are separate layers. None owns another, and they combine through links rather than a fixed tree:

```text
Skills (canonical, shared)          <- evidence and the Skill Passport attach here
Content: Games -> Activities -> Work Orders / Courses
Groupings (tags, many-to-many):  Trade paths | Industries
Programs (curated bundles of groupings + content, with their own site/branding)
Organizations / partners (tenants): offer programs, brand them, schedule and assign
```

- **Skills are the common currency.** A Scout merit, a broadband-operator career path, and an ATS program all count the same canonical skills, so progress carries across games and organizations.
- **Trades and industries are tags, not containers.** Content can belong to several trades and industries at once, and a trade can span several games.
- **Programs are curated bundles.** A program can be one game (ATS), one trade (Heavy Equipment), an industry (Broadband), or a broad system like Scout Merits that spans many trades and games. Adding a program adds no new data model.
- **Organizations (tenants) choose and brand programs; they do not own content.** Broadband operators, businesses, schools, community groups, and Scouts turn on the programs they want, apply their branding, set schedules, and assign work. The existing parent/child organization structure handles partner hierarchies.
- **Access comes only from organization membership and roles, never from which program someone is browsing.**


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
- Owner: the platform admin, plus a contact

Assessment deliverable: a short document that compares the registry with what each site actually runs today. It covers where the sites overlap, gaps, and which fields each site can use now. No capability is marked supported until it has been checked against the live site.

## 2. Canonical destinations and naming
- Initial registry entries: merits.fgn.academy, maritime.fgn.academy, simracing.fgn.academy, and Railroading at railway.fgn.gg.
- **Railroading:** canonical address `railway.fgn.gg`, display name "Railroading". Any other railroad or railway addresses FGN controls redirect there.
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

## 5. Preserve the FGN.GG competition-to-skills path
The current path stays exactly as it is:

```text
play FGN.GG challenge -> completion sent to Academy -> matching Work Order / Course progress -> evidence -> Skill Passport
```

- No changes to the challenge import, completion sync, achievement polling, retry queue, or challenge-to-lesson mappings.
- Challenge links keep using the plural `/challenges/:id` form and the FGN origin challenge ID.
- FGN.GG (Arena Hub) is listed in the registry as the competition source with "progress inbound" capability, but it is not treated as an Academy program and nothing in that project changes.
- The new navigation makes this path easier to see: on Work Orders and Courses that came from a challenge, "My learning" shows "From FGN.GG challenge", and program pages link to the related challenges.
- Verification: an existing challenge-backed Work Order still opens from its FGN.GG link, still shows its progress, and still links back to the challenge.

## 6. Who manages what (multi-tenant, like FGN.GG)
- **Platform admin** owns the registry. Only they can create programs, change the canonical address, availability, games, pathways, or integrations.
- **Community admin** (an organization's admin) manages their own organization only: its branding, its own scheduling (cohorts, events, assignment dates), members, and assigned work. They can choose which programs their organization offers, but they cannot edit the programs themselves.
- This uses the organization admin and owner roles that already exist. Platform roles stay in their own separate table. Nothing is stored on profiles, and the organization switcher is not involved.

## 7. Programs, games, and trades (many-to-many)
The model keeps three things separate so this can grow:

```text
Game (e.g., American Truck Simulator, Farming Simulator)
Trade skill path (e.g., Heavy Equipment) -- can draw on several games
Program -- can be a single game, a trade across games, or a vertical (Maritime, Railroading)
```

- A game can be its own program (for example ATS or Farming Simulator) and still feed trade paths elsewhere.
- A trade path can be its own program and also appear as a general Academy track.
- Skills stay canonical and are never owned by a game. This matches the existing canonical-skills rule, so skills earned across several games count toward one path.

## Technical details
- New `programs` table (with GRANTs and RLS: public read of live/preview rows through a `public_programs` view, writes limited to `has_role(uid,'admin'|'super_admin')`), seeded with the four sites and FGN.GG as a competition source.
- Link tables: `program_games` (program to game) and `program_pathways` (program to Course or Work Order track). There is no single-game column, so a trade can span several games and a game can belong to several programs.
- `tenant_program_offerings` (tenant, program, enabled, schedule notes): community admins can write rows only for their own tenant (via `is_tenant_admin`); platform admins can write any row.
- Community-admin branding and scheduling reuse the existing tenant branding fields and event and assignment tables. No new role is added unless the gap assessment finds one missing.
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

## Decisions confirmed
1. Railroading: canonical address `railway.fgn.gg`, display name "Railroading".
2. Program owner: the platform admin owns every program entry.
3. Trades can exist both as their own programs and as general Academy tracks, and a trade can draw on several games.

## Remaining question
- Should any `*.fgn.academy` railroad addresses redirect to `railway.fgn.gg`? A redirect is set up only where FGN controls the domain.

## Out of scope
No changes to the code or data of Merits, Maritime, Sim Racing, Railway, or FGN.GG. No tenant ID, permission, or data consolidation.
