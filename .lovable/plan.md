

# Plan: Add Hero Image Display to Community Cards

## Problem Summary

The `CommunityFormDialog` already supports uploading a cover image for communities, and the `cover_image_url` field exists in both the database and the `Tenant` type. However, the `CommunityCard` component doesn't display this hero image - it only shows the logo avatar.

## Current vs Proposed State

```text
CURRENT CommunityCard Layout
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Brand Color Border Top]                                   ││
│  │                                                             ││
│  │  [Logo Avatar]   Community Name          [✏ Edit]          ││
│  │                  @community-slug                            ││
│  │                                                             ││
│  │  ───────────────────────────────────────────────────────── ││
│  │  👥 Members    🏆 Events    ⭐ Rating                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

PROPOSED CommunityCard Layout (matches EventCard pattern)
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │          [Hero/Cover Image]                      [📷][✏]   ││
│  │           with gradient overlay                             ││
│  │                                                             ││
│  │  [Logo Avatar overlay]           [Featured Badge if set]   ││
│  │                                                             ││
│  │  ───────────────────────────────────────────────────────── ││
│  │                                                             ││
│  │  Community Name                                             ││
│  │  @community-slug                                            ││
│  │                                                             ││
│  │  ───────────────────────────────────────────────────────── ││
│  │  👥 Members    🏆 Events    ⭐ Rating                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## No Database Changes Required

The `cover_image_url` column already exists in the `tenants` table and is already included in the `CommunityFormDialog` form.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/marketplace/CommunityCard.tsx` | Add hero image section with `EditableImageWrapper` |

---

## Implementation Details

### CommunityCard Updates

**New Features:**
1. Display `community.cover_image_url` as a hero image at the top of the card
2. Add gradient overlay for text readability
3. Overlay the logo avatar on the hero image (bottom-left corner)
4. Add inline editing via `EditableImageWrapper` for the hero image (separate from logo editing)
5. Use brand color as fallback background when no cover image is set

**Layout Changes:**

```text
Before:
├── glass-card (border-top: brand_color)
│   └── p-5 container
│       ├── Header (avatar + name)
│       └── Stats grid

After:
├── glass-card (no border-top, hero has brand color fallback)
│   ├── Hero Image Section (h-32)
│   │   ├── cover image OR brand color background
│   │   ├── gradient overlay
│   │   ├── logo avatar (bottom-left)
│   │   ├── featured badge (if applicable)
│   │   └── EditableImageWrapper for cover editing
│   └── Content Section (p-4)
│       ├── Name + slug
│       └── Stats grid
```

**New State and Handlers:**

```typescript
const [showCoverPicker, setShowCoverPicker] = useState(false);

const handleCoverImageSelect = async (url: string) => {
  const { error } = await supabase
    .from('tenants')
    .update({ cover_image_url: url })
    .eq('id', community.id);
  
  if (error) throw error;
  
  queryClient.invalidateQueries({ queryKey: ['communities'] });
  toast({ title: 'Cover image updated' });
};
```

**Visual Design:**
- Hero section height: ~128px (h-32)
- Logo avatar positioned at bottom-left of hero, overlapping the edge
- Gradient overlay from transparent to background color
- If no cover image, use brand color as solid background
- Edit button for hero in top-right corner of hero section
- Existing logo edit via avatar (already implemented)

---

## Data Flow

```text
Admin hovers on CommunityCard hero section
        │
        ▼
Camera icon appears (via EditableImageWrapper)
        │
        ▼
Admin clicks → MediaPickerDialog opens
        │
        ▼
Select/upload image → handleCoverImageSelect called
        │
        ▼
Supabase: UPDATE tenants SET cover_image_url = ?
        │
        ▼
Invalidate 'communities' query → Card re-renders with new hero
```

---

## Edit Points on Card

| Element | Edit Method | Handler |
|---------|-------------|---------|
| Hero/Cover Image | `EditableImageWrapper` on hero section | `handleCoverImageSelect` (NEW) |
| Logo | `EditableImageWrapper` on avatar (existing) | `handleImageSelect` (existing) |
| Full Edit | Pencil button → `CommunityFormDialog` | `onEdit` prop (existing) |

---

## Fallback Behavior

```text
If cover_image_url is set:
  → Display cover image with gradient

If cover_image_url is null:
  → Display brand_color as solid background
  → Optionally show a subtle pattern or icon
```

---

## Technical Notes

1. **Consistent with EventCard**: The hero image pattern matches the work order cards
2. **Two MediaPickerDialogs**: One for logo (existing), one for cover (new)
3. **Brand Color Fallback**: When no cover image, use `community.brand_color` as background
4. **Maintains Existing Features**: Logo editing, pencil edit button, and navigation all remain

---

## Estimated Effort

| Task | Time |
|------|------|
| Add hero image section with gradient | 15 min |
| Reposition logo avatar as overlay | 10 min |
| Add cover image EditableImageWrapper | 10 min |
| Add second MediaPickerDialog for cover | 5 min |
| Adjust spacing and typography | 10 min |
| Testing & polish | 10 min |
| **Total** | **~1 hour** |

---

## Summary

This enhancement displays the cover/hero image that can already be uploaded via the form:

1. **Hero Display**: Shows `cover_image_url` at top of card with gradient overlay
2. **Brand Fallback**: Uses brand color when no cover is set
3. **Inline Editing**: `EditableImageWrapper` for quick cover updates directly from the card
4. **Logo Overlay**: Repositions avatar to overlay the hero section
5. **Consistent UX**: Matches the EventCard visual pattern

