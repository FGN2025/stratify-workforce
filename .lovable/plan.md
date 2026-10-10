# Rename "Apps" → "Industries" and "Assignments" → "Work Orders"

## What changes

Learner-facing labels only. Routes stay exactly as they are (`/apps`, `/work-orders`, `/apps/:key`), so no redirects, links, or data change.

### 1. "Apps" → "Industries" (learner + public surfaces)

- `src/components/layout/AppSidebar.tsx` — sidebar item "Apps" → "Industries".
- `src/components/layout/PublicLayout.tsx` — public nav link "Apps" → "Industries".
- `src/pages/Index.tsx` — hero button "Explore apps" → "Explore industries"; hero copy "Discover simulation-powered apps across…" → "…industries across…".
- `src/pages/Marketplace.tsx` — page heading "FGN Academy apps" → "FGN Academy industries"; carousel "Featured apps" → "Featured industries"; empty state "No apps match these filters yet." → "No industries match…"; "All apps" back-links (detail + discipline pages) → "All industries"; detail carousel "Apps in this discipline" → "Industries in this discipline".
- `src/pages/Workspace.tsx` — signed-in carousel "My Academy apps" → "My Academy industries".

### 2. "Assignments" → "Work Orders" (sidebar + quick links)

- `src/components/layout/AppSidebar.tsx` — learner item "Assignments" (/work-orders) → "Work Orders"; community-admin item "Assignments" (/admin/work-orders) → "Work Orders".
- `src/pages/admin/CommunitySetup.tsx` — quick link "Assignments" → "Work Orders".

### 3. Deliberately unchanged

- `src/pages/CommunityProfile.tsx` manager tab "Assignments" — the page already has a "Work Orders" tab directly above it; renaming would create two identical tab labels. It stays as the distinct assignment-manager tab.
- Admin "Apps & disciplines" marketplace tab, Studio submission filters ("Filter by Academy app"), "Authorized Apps" (developer credential API) and Developers "My Apps" — these refer to the app registry / API concepts, not the learner-facing industries menu, and keep their existing terminology.

## Verification

- Typecheck (`tsgo --noEmit -p tsconfig.app.json`).
- Browser check: learner sidebar shows "Industries" and "Work Orders"; `/apps` heading reads "FGN Academy industries"; signed-in Workspace carousel title updated; no console or build errors.
