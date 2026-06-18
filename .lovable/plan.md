## Goal

Today, every `/admin/*` route is gated by `AdminRoute`, which only allows platform-level `admin`/`super_admin`. Community owners and admins (rows in `community_memberships` with role `owner` or `admin`) have no way to manage their own community in the admin UI. Meanwhile, platform super admins can technically reach the admin pages but the tenant-scoped panels (Community Setup, Curation, Branding, Members, Work Orders, etc.) read from the active tenant context — there is no first-class "manage *that* community" experience.

This plan formalizes two tiers of admin, and gives both a clear surface.

## Tiers

| Tier | Who | Scope |
|---|---|---|
| **Platform Admin** | `user_roles.role` ∈ {`super_admin`, `admin`} | Every community + every platform-only panel (Authorized Apps, Webhooks, AI Config, Sync Tester, etc.) |
| **Community Admin** | `community_memberships.role` ∈ {`owner`, `admin`} for a given tenant (and inherited via `get_parent_tenants`) | Only the communities they own/admin. No platform-only panels. |

Membership roles `manager` and `moderator` stay out of admin for now (existing review queues already cover them).

## What changes

### 1. New route guard: `CommunityAdminRoute`

Replaces `AdminRoute` on tenant-scoped admin pages. Allows access if **either**:
- `useUserRole().isAdmin` is true (platform), **or**
- `useTenantAdminGuard().isTenantAdmin` is true for the active tenant.

`AdminRoute` itself stays as-is and keeps protecting platform-only pages.

### 2. Admin sections reclassified

`src/pages/Admin.tsx` already has a `section` switch. We tag each section as `platform`, `community`, or `both`:

- **Community-scoped** (CommunityAdminRoute): `community-setup` (new section, see #3), `curation`, `users` (filtered to tenant members), `events`, `work-orders`, `evidence`, `codes`, `media`, `career-paths`, `challenge-mappings`, `challenge-tracks`, `community-review` *(only for managers of that tenant)*.
- **Platform-only** (AdminRoute + `isSuperAdmin` check kept): `authorized-apps`, `webhooks`, `credential-types`, `discord`, `ai-config`, `notebook-telemetry`, `sync-tester`, `play-webhook-retry`, `parity-monitor`, `super-admin`, `sim-categories`, `sim-resources`, `games`, `breakroom-mapper`, `play-sync`.

`renderSection()` gets a `canManagePlatform` check (today's `isSuperAdmin`) and a `canManageTenant` check (new) before rendering each section, so a community admin who hand-types a platform URL gets blocked.

### 3. "Community Setup" promoted to a community management hub

Rename the `/admin/community-setup` sidebar link to **"This Community"** for community admins and keep it as "Community Setup" for platform admins. The page itself becomes a small landing card that shows the active tenant and links to the community-scoped admin sections above (Setup wizard, Curation, Members, Branding, Work Orders, Events, Codes, Media, Career Paths).

No changes to the actual setup wizard.

### 4. Sidebar tier awareness (`AppSidebar.tsx`)

`showAdmin` currently = `isAdmin`. New:

```
showPlatformAdmin = isAdmin                        // platform-only items
showCommunityAdmin = isAdmin || isTenantAdmin       // community-scoped items
```

Group the admin nav into two collapsibles:
- **Platform Admin** (only when `showPlatformAdmin`)
- **Community Admin — {active tenant name}** (when `showCommunityAdmin`)

Community admins only ever see the second group, scoped to communities they administer. The existing TenantSwitcher already lets a platform admin hop between communities; community admins only see their own tenants in the switcher (it already reads from memberships).

### 5. Platform "Communities" management table (super admin convenience)

New section `/admin/communities` (platform-only) listing every approved tenant with: name, owner, member count, setup status, "Open as admin" button that sets active tenant and routes to `/admin/community-setup`. Lets super admins jump into any community without slug-typing.

Source: `tenants` table + existing `community_memberships` for owner lookup. No new DB.

## Database / RLS

No schema changes. All gating uses existing functions: `has_role`, `is_tenant_admin`, `has_tenant_role_inherited`, `get_parent_tenants`. Tenant-scoped tables (`tenants`, `tenant_*_curation`, `work_orders`, `events`, `registration_codes`, etc.) need a quick RLS audit to confirm community admins can write to rows scoped to their tenant. Where a policy currently checks only `has_role('admin')`, we add an `OR is_tenant_admin(auth.uid(), tenant_id)` branch. Migration will be a single file listing each affected policy; no data changes.

## Out of scope

- New membership roles or permission matrix beyond owner/admin.
- Per-section granular permissions (e.g. "events editor but not curator"). Owner = admin for now.
- Tenant-scoped audit log UI.
- Mobile-specific layout for the new community hub.

## Technical details

Files touched:

- `src/components/auth/CommunityAdminRoute.tsx` *(new)* — wraps `AdminRoute` logic but also accepts tenant admins.
- `src/App.tsx` — swap guard on tenant-scoped routes; add `/admin/communities` route (platform-only).
- `src/pages/Admin.tsx` — section tier table + per-section guard before render; new `communities` section component.
- `src/components/admin/CommunitiesAdminTable.tsx` *(new)* — platform list with "Open as admin".
- `src/components/layout/AppSidebar.tsx` — split admin group into Platform + Community; use `useTenantAdminGuard`.
- `src/pages/admin/CommunitySetup.tsx` — add quick-links grid to community-scoped sections.
- Optional RLS migration: extend policies on `tenants` (update), `tenant_*_curation`, `events`, `work_orders`, `registration_codes`, `site_media`, `career_paths` to grant write to `is_tenant_admin(auth.uid(), tenant_id)`.

Result: platform admins keep full control; community owners/admins get a scoped admin surface for their community only, with no code path leaking platform-only tools to them.
