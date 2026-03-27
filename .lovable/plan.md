

# Lock Down Admin-Only Routes and Navigation for Students

## Problems Found

1. **`/students` route** — wrapped in `ProtectedRoute` (auth-only), not `AdminRoute`. Any logged-in user can access the full student roster.
2. **`/settings` route** — same issue; settings page exposes tenant config, branding, and data exports to all authenticated users.
3. **`/developers` route** — no route guard at all (fully public). The "My Apps" tab has a role check inside the component, but the page itself including API docs is open to everyone.
4. **Sidebar** — "Students" and "Settings" links appear under the "Admin" group label for all users. Only "Admin Dashboard" is filtered by role. "Developers" appears in the main nav for everyone.

## Plan

### 1. Protect `/students` with AdminRoute (App.tsx)

Change the `/students` route from `ProtectedRoute` to `AdminRoute` so only admins/super_admins can access it.

### 2. Protect `/settings` with AdminRoute (App.tsx)

Same change — wrap `/settings` in `AdminRoute` instead of `ProtectedRoute`.

### 3. Guard `/developers` route (App.tsx)

Wrap `/developers` in the existing `DeveloperRoute` component so only developer/super_admin roles can access it. API docs being public is acceptable per existing design, but credential management and the full portal should require the developer role.

### 4. Hide non-admin sidebar items (AppSidebar.tsx)

Move "Students" and "Settings" into the `adminOnly` filter so they are hidden from non-admin users, matching the existing "Admin Dashboard" behavior. Move "Developers" out of mainNavItems and into a role-gated section (visible to developer + admin roles only).

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Wrap `/students` and `/settings` in `AdminRoute`; wrap `/developers` in `DeveloperRoute` |
| `src/components/layout/AppSidebar.tsx` | Add `adminOnly: true` to Students and Settings nav items; conditionally show Developers link based on role |

