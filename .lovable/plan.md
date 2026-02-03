

# Plan: Per-Work-Order Cover Images with Database Schema Changes

## Overview

Add the ability for each work order to have its own custom cover image, replacing the current system where all work orders of the same game type share a generic game cover image. This involves a database schema change and updates to multiple components.

## Current State

```text
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT IMAGE LOGIC                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Work Order (game_title: 'ATS')                                 │
│         │                                                        │
│         └──► useGameCoverImages() ──► Returns generic ATS image │
│                                                                  │
│  Work Order (game_title: 'ATS')  ──► Same generic ATS image     │
│                                                                  │
│  Work Order (game_title: 'ATS')  ──► Same generic ATS image     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Problem: All ATS work orders look identical in card views
```

## Proposed State

```text
┌─────────────────────────────────────────────────────────────────┐
│                     NEW IMAGE LOGIC                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Work Order 1 (cover_image_url: "https://...")                  │
│         │                                                        │
│         └──► Uses custom cover_image_url                        │
│                                                                  │
│  Work Order 2 (cover_image_url: null)                           │
│         │                                                        │
│         └──► Falls back to game cover from useGameCoverImages() │
│                                                                  │
│  Work Order 3 (cover_image_url: "https://...")                  │
│         │                                                        │
│         └──► Uses custom cover_image_url                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Solution: Each work order can have unique imagery while maintaining fallback
```

---

## Database Schema Change

### New Column

| Table | Column | Type | Nullable | Default |
|-------|--------|------|----------|---------|
| `work_orders` | `cover_image_url` | `text` | Yes | `NULL` |

### Migration SQL

```sql
ALTER TABLE work_orders
ADD COLUMN cover_image_url text;

COMMENT ON COLUMN work_orders.cover_image_url IS 
  'Optional custom cover image URL. Falls back to game-type cover if null.';
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useWorkOrders.ts` | Add `cover_image_url` to `WorkOrderWithXP` interface and query mapping |
| `src/types/tenant.ts` | Add `cover_image_url` to `WorkOrder` type |
| `src/components/marketplace/EventCard.tsx` | Use `workOrder.cover_image_url` with game fallback, add `EditableImageWrapper` |
| `src/components/dashboard/WorkOrderCard.tsx` | Add cover image display with edit capability |
| `src/components/admin/WorkOrderEditDialog.tsx` | Add cover image URL field with MediaPickerDialog integration |

---

## Implementation Details

### 1. Database Migration

Add the `cover_image_url` column to the `work_orders` table. Nullable text field with no default - allowing each work order to optionally specify a custom cover.

### 2. Type Updates

**src/types/tenant.ts - WorkOrder interface:**
```typescript
export interface WorkOrder {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  game_title: GameTitle;
  success_criteria: Record<string, number>;
  is_active: boolean;
  created_at: string;
  cover_image_url: string | null;  // NEW
  tenant?: Tenant;
}
```

**src/hooks/useWorkOrders.ts - WorkOrderWithXP interface:**
```typescript
export interface WorkOrderWithXP {
  // ... existing fields ...
  cover_image_url: string | null;  // NEW
}
```

### 3. EventCard Component Updates

The EventCard currently uses `useGameCoverImages()` to get a generic game cover:

```typescript
// Current logic (line 43-44)
const { gameCoverImages } = useGameCoverImages();
const coverImage = gameCoverImages[workOrder.game_title];
```

New logic with fallback:

```typescript
// New logic
const { gameCoverImages } = useGameCoverImages();
const coverImage = ('cover_image_url' in workOrder && workOrder.cover_image_url) 
  ? workOrder.cover_image_url 
  : gameCoverImages[workOrder.game_title];
```

Add `EditableImageWrapper` around the cover image to enable admin editing:

```text
┌─────────────────────────────────────────────────────────────────┐
│  EventCard with Admin Edit Capability                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │          [Cover Image]                        [📷]       │    │
│  │                                             (admin)      │    │
│  │          XP Badge                                        │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Community Avatar + Name                                         │
│  Work Order Title                                                │
│  Difficulty • ~30 min                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. WorkOrderCard Component Updates

The dashboard `WorkOrderCard` currently shows only a `GameIcon`, not a cover image. Two options:

**Option A (Minimal):** Keep current layout, no cover image display
**Option B (Enhanced):** Add small thumbnail image like the compact EventCard

Recommended: **Option A** for now to keep dashboard compact. The EventCard handles the visual marketing view.

### 5. WorkOrderEditDialog Updates

Add cover image section to the admin edit dialog:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Edit Work Order                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Title: [_____________________________________]                  │
│  Description: [________________________________]                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Cover Image (Optional)                                  │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │                                                    │  │    │
│  │  │   [Current Preview or Placeholder]                │  │    │
│  │  │                                                    │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  [Change Image]              [Remove]                   │    │
│  │                                                          │    │
│  │  Falls back to game cover if not set                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Game: [ATS ▼]           Difficulty: [Beginner ▼]               │
│  ...                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**New state and handlers:**
- `coverImageUrl` state initialized from `workOrder.cover_image_url`
- `showMediaPicker` state to control MediaPickerDialog
- On save: include `cover_image_url` in the update payload

### 6. WorkOrderDetail Page (Optional Enhancement)

The detail page at `/work-orders/:id` could also display the cover image as a hero. Currently it only shows a `GameIcon`. This is optional but would provide visual consistency.

---

## Data Flow

```text
Admin opens WorkOrderEditDialog
        │
        ▼
Clicks "Change Image" button
        │
        ▼
MediaPickerDialog opens (Upload / URL / Library)
        │
        ▼
Selects/uploads image ──► Returns URL
        │
        ▼
coverImageUrl state updated ──► Preview shown
        │
        ▼
Admin clicks "Save"
        │
        ▼
Supabase: UPDATE work_orders SET cover_image_url = ?
        │
        ▼
React Query invalidation ──► EventCard re-renders with new image
```

---

## Affected Components Summary

| Component | Current Behavior | New Behavior |
|-----------|-----------------|--------------|
| `EventCard` | Uses game-type cover | Uses `cover_image_url` with game fallback, admin edit overlay |
| `WorkOrderCard` | GameIcon only | No change (keep minimal) |
| `WorkOrderEditDialog` | No image field | New cover image section with MediaPickerDialog |
| `WorkOrderDetail` | GameIcon only | Optional: hero image from cover_image_url |

---

## Estimated Effort

| Task | Time |
|------|------|
| Database migration (add column) | 5 min |
| Type updates (WorkOrder, WorkOrderWithXP) | 10 min |
| useWorkOrders hook update | 10 min |
| EventCard update with fallback + EditableImageWrapper | 30 min |
| WorkOrderEditDialog cover image section | 45 min |
| Testing & edge cases | 20 min |
| **Total** | **~2 hours** |

---

## Summary

This implementation adds per-work-order cover images while maintaining backward compatibility:

1. **Database**: New nullable `cover_image_url` column on `work_orders`
2. **Fallback Logic**: If `cover_image_url` is null, use game-type cover image
3. **Admin Edit**: Inline editing via `EditableImageWrapper` + `MediaPickerDialog` on EventCard
4. **Dialog Edit**: Cover image section in `WorkOrderEditDialog` for full CRUD
5. **Reuses Phase 1 Infrastructure**: `EditableImageWrapper` and `MediaPickerDialog` from the previous implementation

