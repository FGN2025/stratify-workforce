# Simplify the sidebar around Studio as the authoring authority

## Goal
Make the sidebar reflect one clear operating model:

```text
Studio: create and configure
Academy: review, publish, curate, assign, verify and govern
```

The sidebar should lead people to work they perform in Academy, not expose every underlying registry or legacy tool as a separate destination.

## Assessment of the current sidebar

- The learner navigation is structurally sound, but **Help** and **Platform Guide** are duplicate support destinations.
- Community admins currently see nine Academy tools plus a **Configurator** that repeats Communities, Categories and Work Orders already available elsewhere.
- Platform admins see creation, review, users, communities, catalog, challenges, simulations and integrations as peers, although several are advanced registries rather than daily tasks.
- Super admins receive eight more individual links, even where the tools belong to one operational area such as integrations or platform access.
- **Users** and the standalone **Students** page split account administration from learner monitoring.
- The Admin hero and statistics are rendered above every section, making each task page longer and obscuring the selected tool.
- Course Builder remains directly routable but is already absent from the sidebar; Breakroom Mapper redirects, while Breakroom identity management still appears inside Challenge Registry.

## Proposed sidebar

### Learners

- **Discover:** Academy Apps, Course Catalog, Careers
- **My learning:** Workspace, Assignments, Skill Passport, Leaderboard
- **My organization:** Membership, Events, Help

Remove the separate Platform Guide entry; Help routes each signed-in role to the correct guide.

### Community admins

Use one **Community Admin** section with:

- **Overview** — community status and shortcuts
- **People** — members, invitations and learner progress
- **Assignments** — manage, assign and publish existing Work Orders; “Create” opens Studio
- **Evidence Review** — retains the pending badge
- **Events**
- **Catalog** — app-level curation first, then item exceptions
- **Access** — registration codes and membership controls
- **Community Settings** — identity, media and connected community services

Remove **Configurator** from the menu and retire it as a destination. Keep Skills Paths in Academy for now, but place it inside Catalog as a Pathways tab instead of a top-level link. Keep the Media Library available contextually from Catalog and Community Settings rather than as a primary menu item.

### Platform admins

Use one **Academy Operations** section:

- **Create in Studio** — visually primary external-authoring entry
- **Review Inbox** — pending Studio submissions and revision requests
- **Content Operations** — Work Orders, Courses, publication readiness and app filters
- **Evidence Review**
- **People** — Accounts and Learner Progress tabs, replacing separate Users and Students links
- **Communities** — Registry, Approval Queue and community access tabs
- **Marketplace** — apps, disciplines, identity, curation and pathways
- **Integrations** — health, retries, parity, sources and legacy mappings
- **Platform Settings** — authorized apps, credentials, webhooks, Discord and AI configuration

Show **Super Admin** as one final restricted destination containing tenants, roles, audit logs and dangerous operations. Notebook Telemetry moves under Integrations while it remains Academy-owned.

## Advanced and legacy tools

- Move Challenge Registry, challenge mappings/tracks and Activity Mapping under **Integrations → FGN.GG & Legacy Mappings**.
- Keep manual overrides for existing FGN.GG-linked records and migration review; do not present these as authoring tools.
- Remove the Breakroom Users tab from Challenge Registry. Put any still-required identity exception handling under Integrations; automatic Breakroom sync remains unchanged.
- Keep Simulations as an advanced Marketplace/Integrations area for internal game, category and resource registries; do not restore SIM Categories to learner navigation.
- Keep the FGN.GG import fallback inside Content Operations until Studio can distribute to FGN.GG, then remove it without changing completion, points or Skill Passport connectivity.
- Keep Course Builder reachable only until a real Studio package passes the joint acceptance test, then redirect its old route to Create in Studio or Content Operations.

## Admin page behavior

- Add a task-oriented Admin Overview with queue counts and shortcuts for Review Inbox, Evidence Review and Community Review.
- Show the large Admin hero and summary statistics only on Overview, not above every admin tool.
- Keep the selected branch expanded and active route highlighted; icon-collapse continues to preserve a usable mini sidebar.
- On small screens, preserve the existing off-canvas behavior and keep the header trigger visible.
- Use pending badges only for actionable queues, not registries.

## Implementation sequence

1. **Create the role-aware menu model**
   - Define learner, community, platform and super-admin groups from one navigation configuration.
   - Preserve the existing permission checks and hide destinations a role cannot use.

2. **Build the Academy hubs**
   - Consolidate People, Communities, Marketplace, Integrations and Platform Settings into tabbed destinations using existing managers.
   - Add Admin Overview and stop repeating its hero/statistics on section pages.

3. **Remove duplicate entry points**
   - Retire Configurator and route its tabs to the corresponding Academy hub.
   - Merge Users with Students, Community Review with Communities, and the individual super-admin integration links into their hubs.
   - Remove the duplicate Platform Guide link and the remaining Breakroom authoring surface.

4. **Preserve bookmarks safely**
   - Redirect old admin URLs to the matching new tab, including query state where needed.
   - Keep legacy mapping and Course Builder routes until their stated release gates close.

5. **Align labels and guidance**
   - Change Academy copy from “author/configure” to “review, publish, assign or manage” where Studio owns creation.
   - Update the Community Setup shortcuts and admin guide to match the new menu.

6. **Verify by role and viewport**
   - Check learner, community admin, platform admin and super admin navigation.
   - Verify active states, expanded groups, collapsed icons, pending badges and old-route redirects on desktop and mobile.
   - Confirm FGN.GG challenge import/completion, Studio submissions, Breakroom sync, Work Order publication checks and internal SIM taxonomy remain operational.

## Technical details

- This is primarily a navigation and page-composition change; no new database model is required.
- Existing manager components remain the source of behavior and are mounted inside the new hubs.
- Route aliases and redirects protect bookmarks while the sidebar exposes only the simplified information architecture.
- No changes are made to FGN.GG, Merits, Maritime, Sim Racing, Railway or their independently deployed sites.
- Studio remains the only authoring front door; Academy remains authoritative for approval, publication, access, evidence, learner records and integration health.