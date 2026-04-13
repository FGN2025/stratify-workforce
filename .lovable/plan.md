

# Plan: Add Admin Detail View for Work Orders

## Current State
- **WorkOrdersManager** (admin table at `/admin/work-orders`) — flat table with edit/delete actions, no way to click through to a detail view
- **WorkOrderDetail** (`/work-orders/:id`) — student-facing detail page with progress tracking, evidence uploads, and "Launch Challenge" actions. Already has admin-only features like `EditableImageWrapper` for cover images
- The table title cells are plain text — not clickable links

## Approach
Rather than building a separate admin detail page, **make the existing WorkOrderDetail page work in both contexts** by adding a link from the admin table and showing admin-specific metadata when accessed by an admin.

### Changes

**1. `WorkOrdersManager.tsx` — Make title cells clickable**
- Wrap each work order title in a `NavLink` to `/work-orders/{id}` so admins can click through to the detail view directly from the management table
- Add an `Eye` icon button in the Actions column alongside Edit and Delete

**2. `WorkOrderDetail.tsx` — Add admin info panel**
- For admin users, render an expandable "Admin Details" card showing:
  - `fgn_origin_challenge_id` (linked to play.fgn.gg if present)
  - `source_challenge_id` (internal)
  - `channel_id` and channel name
  - `tenant_id` and tenant name
  - `created_at` timestamp
  - `is_active` status toggle
  - Quick "Edit" button that opens the WorkOrderEditDialog inline
- Conditionally rendered using the existing `useUserRole` hook to check for admin/super_admin
- Back button should be context-aware: if the referrer is `/admin/work-orders`, link back there instead of `/work-orders`

**3. `useWorkOrderById` — Include origin fields**
- The hook already returns `source_challenge_id` and `cover_image_url`
- Verify `fgn_origin_challenge_id` is also returned (it's in the DB schema but may not be in the select)

### Files Modified
- `src/components/admin/WorkOrdersManager.tsx` — add NavLink on title, add View button
- `src/pages/WorkOrderDetail.tsx` — add admin details panel
- `src/hooks/useWorkOrders.ts` — ensure `fgn_origin_challenge_id` is in the query return

### No new routes or pages needed

