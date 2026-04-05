

## Challenge Registry - Implementation Plan

### Overview
A new admin-only page at `/admin/challenge-registry` with two tabs: **Challenges** (work order cross-platform mapping) and **Breakroom Users** (breakroom_identity management). Admin/super_admin access only.

### Files to Create

**1. `src/pages/ChallengeRegistry.tsx`**
Main page component wrapped in `AppLayout` with `AdminRoute` protection. Contains the page header ("Challenge Registry" / subtitle) and a `Tabs` component with two tabs routing to the sub-components below.

**2. `src/components/admin/ChallengesTab.tsx`**
Reads `work_orders` table (all rows, not just active). Displays table with columns: Title, Game Title (colored badge using `useGameChannelColors`), source_challenge_id (monospace + copy button), Is Active (green/red dot), Breakroom Course Name (inline editable input saving to `metadata->breakroom_course_name` on blur), BBW Linked (static grey dash), Actions (3 icon buttons for Copy UUID, Copy PowerShell, Copy Lua).

Toolbar: game_title filter dropdown, active/inactive/all toggle, search input, Export Lua button, Export CSV button.

Inline edit saves optimistically: update local state immediately, fire Supabase upsert of `metadata` jsonb (merge existing metadata with new `breakroom_course_name` key), rollback on error.

Export Lua generates a `.txt` download with the `local COURSE_MAP = { ... }` block. Export CSV generates all columns as CSV.

**3. `src/components/admin/BreakroomUsersTab.tsx`**
Reads `breakroom_identity` joined with `profiles` (username) and `tenants` (name). Email comes from an edge function call since we can't query `auth.users` client-side.

Table columns: FGN Display Name, Email, Breakroom Username (inline editable), Breakroom User ID (inline editable integer), Tenant, Created At, Delete action with confirmation.

Add User modal: email search field (min 3 chars, calls admin-users edge function to search), user selector dropdown, breakroom username/ID fields, tenant dropdown. Inserts into `breakroom_identity`.

Export CSV button for backup.

**4. `supabase/functions/admin-users/index.ts`** (update existing)
Add a `search` action that accepts a query string and returns matching users from `auth.users` by email pattern. This supports the Add User modal's email lookup.

### Files to Modify

**5. `src/components/layout/AppSidebar.tsx`**
Add `{ title: 'Challenge Registry', url: '/admin/challenge-registry', icon: FileCheck }` to `adminSubItems` array (or `superAdminSubItems` if preferred -- will add to `adminSubItems` since both admin and super_admin need access).

**6. `src/App.tsx`**
Add route: `<Route path="/admin/challenge-registry" element={<AdminRoute><ChallengeRegistry /></AdminRoute>} />`

**7. `src/pages/Admin.tsx`**
Add `case 'challenge-registry':` to `renderSection()` -- actually, since this is a standalone page at its own route (not a section of `/admin/:section`), this is handled by the new route in App.tsx. No change needed to Admin.tsx.

### Technical Details

| Concern | Approach |
|---------|----------|
| Game badges | Reuse `useGameChannelColors` hook + `Badge` component with inline `style={{ backgroundColor }}` |
| Metadata upsert | Read existing `metadata`, spread with new `breakroom_course_name`, update via `.update({ metadata })` |
| Email lookup | Extend `admin-users` edge function with search capability using `supabase.auth.admin.listUsers()` with email filter |
| File downloads | Create Blob URLs with `URL.createObjectURL` for Lua/CSV exports |
| Copy to clipboard | `navigator.clipboard.writeText()` with toast confirmation |
| Loading states | Skeleton components matching existing admin patterns |
| Optimistic updates | Update react-query cache immediately, invalidate on error |

### Edge Function Update
The existing `admin-users` edge function will be extended to support a `GET ?action=search&q=email` endpoint that returns `{ id, email, username }[]` for matching auth users. This avoids creating a new function.

