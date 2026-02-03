
# Plan: Community Management System

## Problem Summary

The "Create Community" button on the `/communities` page currently does nothing because no click handler is connected. Additionally, community management is restricted to the Super Admin panel, limiting accessibility for regular admins.

## Solution Overview

Build a complete community management system accessible to admins, with the ability to:
- Create and edit communities directly from the Communities page
- Assign SIM games (ATS, Farming Sim, etc.) to each community
- Assign work orders to communities
- Filter communities by category (Game, Employer, Broadband Provider, School)

---

## Architecture

```text
Communities Page (/communities)
        │
        ├─── [Create Community] button ──────► CommunityFormDialog
        │                                              │
        │                                              ├── Name, Slug, Description
        │                                              ├── Category Type (dropdown)
        │                                              ├── Parent Organization
        │                                              ├── Game Titles (multi-select)
        │                                              ├── Logo/Cover Image
        │                                              └── Brand Color
        │
        └─── CommunityCard (each card)
                    │
                    └── [Edit] button (admin only) ──► CommunityFormDialog

Work Orders Manager (Admin Dashboard)
        │
        └─── WorkOrderEditDialog
                    │
                    └── Community Assignment (dropdown)
```

---

## Database Changes

**No schema changes required** - All necessary columns already exist:

| Table | Column | Status |
|-------|--------|--------|
| `tenants` | `game_titles` (array) | Exists but not used in form |
| `tenants` | `category_type` (enum) | Exists and used |
| `work_orders` | `tenant_id` (uuid) | Exists but no UI for assignment |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/CommunityFormDialog.tsx` | Reusable dialog for creating/editing communities (based on TenantFormDialog but simplified for admin use) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Communities.tsx` | Add dialog state, wire up "Create Community" button, add admin role check |
| `src/components/marketplace/CommunityCard.tsx` | Add edit button for admins |
| `src/components/admin/superadmin/TenantFormDialog.tsx` | Add game_titles multi-select field |
| `src/components/admin/WorkOrderEditDialog.tsx` | Add community/tenant assignment dropdown |
| `src/types/tenant.ts` | Update CATEGORY_LABELS to prioritize the 4 requested types |

---

## Implementation Details

### 1. CommunityFormDialog Component

A simplified version of `TenantFormDialog` accessible to regular admins (not just super_admin).

**Form Fields:**
- **Name** (required) - Community display name
- **Slug** (auto-generated from name) - URL-friendly identifier
- **Description** - Short description
- **Category Type** - Dropdown with:
  - Game (maps to `trade_skill`)
  - Employer
  - Broadband Provider (`broadband_provider`)
  - School
  - Other options remain available
- **Parent Organization** - Optional parent community
- **Game Titles** - Multi-select checkboxes:
  - American Truck Simulator (ATS)
  - Farming Simulator
  - Construction Simulator
  - Mechanic Simulator
- **Logo** - Integration with `MediaPickerDialog`
- **Cover Image** - Integration with `MediaPickerDialog`
- **Brand Color** - Color picker

### 2. Communities Page Updates

**Add to Communities.tsx:**
```typescript
const { isAdmin } = useUserRole();
const [showCreateDialog, setShowCreateDialog] = useState(false);
const [editingCommunity, setEditingCommunity] = useState<Tenant | null>(null);

// Wire up PageHero primaryAction
primaryAction={{
  label: 'Create Community',
  icon: <Plus className="h-4 w-4" />,
  onClick: () => isAdmin && setShowCreateDialog(true),
}}

// Show/hide button based on role
// Dialog at bottom of component
```

**Add refetch capability** - Use React Query's `useQuery` pattern instead of `useEffect` for better cache invalidation.

### 3. CommunityCard Edit Button

Add an edit icon button (visible to admins only) that opens the `CommunityFormDialog` in edit mode.

### 4. TenantFormDialog Game Titles Field

Add a multi-select section for game titles:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Game Titles (Optional)                                          │
│                                                                  │
│  ☑ American Truck Simulator                                     │
│  ☐ Farming Simulator                                            │
│  ☐ Construction Simulator                                       │
│  ☐ Mechanic Simulator                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Update `TenantFormData` interface to include `game_titles: GameTitle[]`.

### 5. WorkOrderEditDialog Community Assignment

Add a dropdown to assign work orders to specific communities:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Community (Optional)                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Select community...                               ▼    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Assigning to a community makes this work order visible         │
│  only to that community's members.                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```text
Admin clicks "Create Community"
        │
        ▼
CommunityFormDialog opens (empty form)
        │
        ▼
Admin fills form:
  - Name: "Acme Trucking School"
  - Category: School
  - Games: [ATS, Construction_Sim]
  - Logo: (uses MediaPickerDialog)
        │
        ▼
Admin clicks "Create"
        │
        ▼
Supabase INSERT into tenants table
        │
        ▼
Invalidate 'communities' query → UI refreshes
        │
        ▼
New community appears in carousel
```

---

## Role-Based Access

| Action | User | Admin | Super Admin |
|--------|------|-------|-------------|
| View communities | Yes | Yes | Yes |
| Create community | No | Yes | Yes |
| Edit community | No | Yes | Yes |
| Delete community | No | No | Yes |
| Assign work orders | No | Yes | Yes |

---

## Category Type Simplification

Update the category labels to prioritize the 4 main types:

```typescript
export const CATEGORY_LABELS: Record<CategoryType, string> = {
  trade_skill: 'Game Community',       // Renamed for clarity
  employer: 'Employer',
  broadband_provider: 'Broadband Provider',
  school: 'School',
  // Secondary options
  training_center: 'Training Center',
  geography: 'Geographic Region',
  government: 'Government',
  nonprofit: 'Nonprofit',
};
```

---

## Technical Notes

1. **React Query Migration** - Convert Communities page from `useEffect` + `useState` to `useQuery` for proper cache invalidation after CRUD operations.

2. **Shared Form Logic** - `CommunityFormDialog` will share most code with `TenantFormDialog` but be accessible to admins (not just super_admin).

3. **Game Titles Storage** - Uses PostgreSQL array column `game_titles game_title[]` with enum values.

4. **MediaPickerDialog Reuse** - Leverage existing infrastructure for logo and cover image selection.

---

## Estimated Effort

| Task | Time |
|------|------|
| CommunityFormDialog component | 45 min |
| Communities page updates (button + dialog) | 20 min |
| CommunityCard edit button | 15 min |
| TenantFormDialog game_titles field | 20 min |
| WorkOrderEditDialog tenant assignment | 20 min |
| React Query migration for communities | 15 min |
| Testing & polish | 25 min |
| **Total** | **~2.5 hours** |

---

## Summary

This implementation enables full community management:

1. **Create Community Button** - Wires up the existing button with role-checking and dialog trigger
2. **CommunityFormDialog** - Admin-accessible form for creating/editing communities
3. **Game Assignment** - Multi-select for assigning SIM games to communities
4. **Work Order Assignment** - Dropdown in WorkOrderEditDialog for tenant assignment
5. **Edit from Cards** - Inline edit button on CommunityCard for admins
6. **Proper Caching** - React Query for automatic UI refresh after changes
