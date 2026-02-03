
# Plan: Add Cover Image Editing to Work Order Detail Page

## Overview

The Work Order Detail page (`/work-orders/:id`) currently displays only a small `GameIcon`, missing both the cover image display and the admin editing capability that was added to `EventCard`. This plan adds a hero-style cover image section with inline editing for admins.

## Current vs Proposed State

```text
CURRENT STATE (WorkOrderDetail.tsx)
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Work Orders                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [GameIcon]   American Truck Simulator   ⭐ Beginner       │ │
│  │               Evidence Test Work Order                      │ │
│  │               ◎ 58 XP  ⏱ ~30 min  👥 24 completed          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

PROPOSED STATE (with cover image hero)
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Work Orders                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────────────────────────────────────┐           │ │
│  │  │                                              │    [📷]  │ │
│  │  │           [Cover Image Hero]                │  (admin) │ │
│  │  │            or Game Fallback                 │           │ │
│  │  │                                              │           │ │
│  │  └─────────────────────────────────────────────┘           │ │
│  │                                                             │ │
│  │  American Truck Simulator   ⭐ Beginner                    │ │
│  │  Evidence Test Work Order                                   │ │
│  │  ◎ 58 XP  ⏱ ~30 min  👥 24 completed                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/WorkOrderDetail.tsx` | Add cover image hero with `EditableImageWrapper` and `MediaPickerDialog` |

---

## Implementation Details

### WorkOrderDetail.tsx Updates

**New imports:**
- `EditableImageWrapper` from `@/components/admin/EditableImageWrapper`
- `MediaPickerDialog` from `@/components/admin/MediaPickerDialog`
- `useGameCoverImages` from `@/hooks/useSiteMedia`
- `supabase` from `@/integrations/supabase/client`
- `useQueryClient` from `@tanstack/react-query`

**New state:**
- `showMediaPicker` boolean to control dialog visibility

**Cover image logic:**
```typescript
const { gameCoverImages } = useGameCoverImages();
const coverImage = workOrder.cover_image_url || gameCoverImages[workOrder.game_title];
```

**Update handler:**
```typescript
const handleCoverImageUpdate = async (url: string) => {
  const { error } = await supabase
    .from('work_orders')
    .update({ cover_image_url: url })
    .eq('id', workOrder.id);
    
  if (error) throw error;
  
  queryClient.invalidateQueries({ queryKey: ['work-order', id] });
  toast({ title: 'Cover image updated' });
};
```

**UI changes:**
Replace the current header layout (GameIcon + info) with a hero-style layout:

1. Add a cover image section at the top of the glass-card header
2. The cover image is ~200px tall with gradient overlay
3. Wrap the image with `EditableImageWrapper` for admin editing
4. Keep the `GameIcon` as a smaller element overlaid or below the hero
5. Move action buttons to the right side (already positioned there)

### Layout Options

**Option A: Full-width hero above content**
```text
┌────────────────────────────────────────────────────────────────┐
│  [━━━━━━━━━━━━━━━ Cover Image Hero ━━━━━━━━━━━━━━━]  [📷]     │
│                                                                 │
│  [Icon]  Title / Description / Stats                [Actions]  │
└────────────────────────────────────────────────────────────────┘
```

**Option B: Side-by-side (image left, info right)** - Recommended
```text
┌────────────────────────────────────────────────────────────────┐
│  ┌────────────┐                                                │
│  │   Cover    │  Title                           [Start]      │
│  │   Image    │  Description                     [Subscribe]  │
│  │    [📷]    │  Stats                                        │
│  └────────────┘                                                │
└────────────────────────────────────────────────────────────────┘
```

I recommend **Option B** as it maintains visual consistency with EventCard while fitting the existing layout structure.

---

## Data Flow

```text
Admin views WorkOrderDetail page
        │
        ▼
Cover image displays (custom or game fallback)
        │
        ▼
Admin hovers on image → Edit icon appears
        │
        ▼
Admin clicks edit → MediaPickerDialog opens
        │
        ▼
Select/upload image → handleCoverImageUpdate called
        │
        ▼
Supabase UPDATE → Query invalidation → UI refreshes
```

---

## Admin UX

As an admin viewing the Work Order Detail page:

1. The cover image appears prominently in the header section
2. Hovering over the image reveals the camera edit icon
3. Clicking opens the MediaPickerDialog with Upload/URL/Library tabs
4. After selection, the image updates immediately
5. Non-admin users see the cover image without edit controls

---

## Technical Notes

- Reuses existing `EditableImageWrapper` and `MediaPickerDialog` from Phase 1
- Uses `useGameCoverImages()` hook for fallback images
- Invalidates `['work-order', id]` query to refresh the detail page
- The `workOrder` from `useWorkOrderById` already includes `cover_image_url`

---

## Estimated Effort

| Task | Time |
|------|------|
| Add imports and state | 5 min |
| Add cover image logic and handler | 10 min |
| Update header layout with image + wrapper | 15 min |
| Add MediaPickerDialog | 5 min |
| Testing & styling polish | 10 min |
| **Total** | **~45 min** |

---

## Summary

This enhancement adds the missing cover image editing to the Work Order Detail page:

1. **Display**: Shows custom cover image with game-type fallback
2. **Admin Edit**: Inline editing via `EditableImageWrapper` + `MediaPickerDialog`
3. **Consistency**: Matches the pattern used in `EventCard` for a unified experience
4. **Reuse**: Leverages Phase 1 infrastructure components

After this implementation, admins can change the cover image directly from the detail page you're currently viewing.
