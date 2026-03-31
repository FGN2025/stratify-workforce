

# Move Admin Sections to Sidebar Sub-Menu

## Summary
Replace the current "Admin Dashboard" single link in the sidebar with an expandable collapsible group. Each admin section (Users, Events, Work Orders, etc.) becomes a sidebar sub-link navigating to `/admin/:section`. The `/admin` page renders the correct section based on the URL parameter, removing the on-page accordion.

## Changes

### 1. Add routes for each admin section
**File: `src/App.tsx`**
- Add route: `/admin/:section` pointing to the same `<AdminRoute><Admin /></AdminRoute>` component
- The existing `/admin` route stays as the default (redirects to `/admin/users` or shows overview)

### 2. Expand sidebar Admin group into collapsible sub-menu
**File: `src/components/layout/AppSidebar.tsx`**
- Replace the single "Admin Dashboard" link with a `Collapsible` group (same pattern as SIM Resources)
- Admin sub-items: Users, Events, Work Orders, Evidence Review, SIM Games, SIM Resources, Media Library, Registration Codes, Skills Paths
- Super Admin sub-items (visible to super admins): Community Review, Authorized Apps, Webhooks, Credential Types, Discord, AI Config, FGN Play, Super Admin
- Each links to `/admin/users`, `/admin/events`, etc.
- Show pending count badges on Evidence Review and Community Review
- Import `usePendingEvidenceCount` and `usePendingCommunityCount` hooks
- Auto-open the collapsible when the current path starts with `/admin`

### 3. Simplify Admin page to render section from URL param
**File: `src/pages/Admin.tsx`**
- Read `section` from `useParams()` (default to `'overview'` or `'users'`)
- Keep AdminHero and AdminStatsGrid at the top (only when section is overview/users or always as a compact header)
- Render the matching section component directly — no accordion wrapper
- Remove all accordion UI code

## Sidebar Structure (Admin Group)

```text
ADMIN
▾ Admin Dashboard        (collapsible trigger → /admin)
    Users                 /admin/users
    Events                /admin/events
    Work Orders           /admin/work-orders
    Evidence Review [3]   /admin/evidence
    SIM Games             /admin/games
    SIM Resources         /admin/sim-resources
    Media Library         /admin/media
    Registration Codes    /admin/codes
    Skills Paths          /admin/career-paths
  ── Super Admin ──       (only if isSuperAdmin)
    Community Review [2]  /admin/community-review
    Authorized Apps       /admin/authorized-apps
    Webhooks              /admin/webhooks
    Credential Types      /admin/credential-types
    Discord               /admin/discord
    AI Config             /admin/ai-config
    FGN Play              /admin/sync-tester
    Super Admin           /admin/super-admin
  Students                /students
  Settings                /settings
  Developers              /developers
```

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/admin/:section` route |
| `src/components/layout/AppSidebar.tsx` | Replace single Admin link with collapsible sub-menu listing all sections |
| `src/pages/Admin.tsx` | Read URL param, render single section directly (no accordion) |

