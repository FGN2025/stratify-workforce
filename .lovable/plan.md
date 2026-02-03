
# Plan: Phase 1 - Editable Image Wrapper and Media Picker Dialog

## Overview

Build reusable infrastructure components for inline image editing across the platform, then apply them to `CourseCard` and `CommunityCard`. This establishes the pattern for all future card-level image editing.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     EDITABLE IMAGE INFRASTRUCTURE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      EditableImageWrapper                                │    │
│  │                                                                          │    │
│  │   ┌──────────────────────────────────────────────────────────────────┐  │    │
│  │   │                                                                   │  │    │
│  │   │                   [children - any image]                         │  │    │
│  │   │                                                                   │  │    │
│  │   │   ┌────────────┐                                                 │  │    │
│  │   │   │ Edit Icon  │  <-- Only visible to admins on hover           │  │    │
│  │   │   └────────────┘                                                 │  │    │
│  │   │                                                                   │  │    │
│  │   └──────────────────────────────────────────────────────────────────┘  │    │
│  │                              │                                          │    │
│  │                              ▼                                          │    │
│  │                    Opens MediaPickerDialog                              │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       MediaPickerDialog                                  │    │
│  │                                                                          │    │
│  │   ┌─────────────────┬─────────────────┬─────────────────┐               │    │
│  │   │  Upload File    │   Enter URL     │  Media Library  │               │    │
│  │   └─────────────────┴─────────────────┴─────────────────┘               │    │
│  │                                                                          │    │
│  │   Tab 1: Drag & drop upload zone                                        │    │
│  │   Tab 2: Direct URL input with preview                                  │    │
│  │   Tab 3: Browse existing media assets                                   │    │
│  │                                                                          │    │
│  │   onSelect(url: string) --> calls parent save callback                  │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```text
Admin hovers on CourseCard image
        │
        ▼
EditableImageWrapper shows edit button
        │
        ▼
Admin clicks edit button
        │
        ▼
MediaPickerDialog opens
        │
        ├─── Upload new file ────────────────────┐
        │                                         │
        ├─── Enter URL directly ──────────────────┤
        │                                         │
        └─── Select from Media Library ───────────┤
                                                  │
                                                  ▼
                                    onSelect(imageUrl)
                                                  │
                                                  ▼
                              onSave({ cover_image_url: imageUrl })
                                                  │
                                                  ▼
                    Supabase: UPDATE courses SET cover_image_url = ?
                                                  │
                                                  ▼
                            React Query invalidation --> UI refresh
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/EditableImageWrapper.tsx` | Reusable wrapper that adds edit overlay to any image |
| `src/components/admin/MediaPickerDialog.tsx` | Combined upload/URL/library picker dialog |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/learn/CourseCard.tsx` | Wrap cover image with `EditableImageWrapper`, add save handler |
| `src/components/marketplace/CommunityCard.tsx` | Wrap avatar with `EditableImageWrapper`, add save handler |
| `src/hooks/useCourses.ts` | Add `useUpdateCourse` hook if needed (already exists) |

---

## Component Specifications

### 1. EditableImageWrapper

A wrapper component that adds an admin-only edit overlay to any image element.

**Props:**
- `children`: The image element to wrap
- `onEdit`: Callback when edit is triggered, opens the picker
- `className`: Optional additional classes for positioning

**Behavior:**
- Checks `isAdmin` or `isSuperAdmin` from `useUserRole` hook
- Shows a semi-transparent overlay with edit icon on hover (admin only)
- Clicking the overlay triggers `onEdit` callback
- Does not interfere with parent link navigation

**UI Design:**
- Overlay appears only on hover with smooth fade transition
- Small camera/pencil icon in corner with glassmorphic background
- Prevents event propagation to avoid triggering card navigation

### 2. MediaPickerDialog

A combined dialog for selecting images via upload, URL, or existing library.

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `onSelect`: (url: string) => void
- `title`: string (e.g., "Change Course Cover")
- `currentImageUrl`: string (for showing current selection)

**Tabs:**
1. **Upload File**: Drag & drop zone (reuse pattern from MediaUploadDialog)
2. **Enter URL**: Text input with live preview
3. **Media Library**: Filterable grid of existing site_media (image type only)

**Behavior:**
- Upload mode: File uploads to `media-assets` bucket, returns public URL
- URL mode: Validates URL format, shows preview
- Library mode: Fetches from `site_media` table, shows selectable grid
- On select: Calls `onSelect(url)`, closes dialog

### 3. CourseCard Updates

**Changes:**
- Import `EditableImageWrapper` and `MediaPickerDialog`
- Import `useUpdateCourse` hook
- Wrap the cover image div with `EditableImageWrapper`
- Add state for picker dialog open/close
- Add save handler that calls `updateCourse.mutateAsync({ id: course.id, cover_image_url: newUrl })`

**Admin UX:**
- When admin hovers on course cover image, edit icon appears
- Clicking opens MediaPickerDialog
- After selection, cover updates immediately (optimistic or refetch)

### 4. CommunityCard Updates

**Changes:**
- Import `EditableImageWrapper` and `MediaPickerDialog`
- Import Supabase client for direct tenant update
- Wrap the Avatar component with `EditableImageWrapper`
- Add state for picker dialog
- Add save handler that updates `tenants.logo_url`

**Admin UX:**
- When admin hovers on community avatar, edit icon appears
- Clicking opens MediaPickerDialog
- After selection, logo updates immediately

---

## Technical Implementation Details

### EditableImageWrapper Component

```text
Structure:
- Relative positioned container
- Children rendered as-is
- Absolute overlay div (only when isAdmin && hover)
- Edit button with onClick that calls onEdit and stops propagation
```

Key considerations:
- Must not break existing card layout or links
- Event propagation must be stopped on edit click
- Overlay should have pointer-events only on the edit button, not entire image

### MediaPickerDialog Component

```text
Reuses:
- Upload zone from MediaUploadDialog (drag/drop, file state, preview)
- Upload mutation from useMediaLibrary hook
- Media grid pattern from MediaLibrary component

New:
- Simplified 3-tab layout (Upload | URL | Library)
- Single select mode (not multi-select)
- No location_key assignment (just returns URL)
- Filter to images only in library tab
```

### Database Considerations

No schema changes required for Phase 1:
- `courses.cover_image_url` already exists
- `tenants.logo_url` already exists
- Both are nullable text columns storing URLs

### Role Check Integration

Both cards will use the existing `useUserRole` hook:

```text
const { isAdmin, isSuperAdmin } = useUserRole();
const canEdit = isAdmin || isSuperAdmin;
```

The `EditableImageWrapper` performs this check internally, so consumers don't need to conditionally render it.

---

## Estimated Effort

| Task | Time |
|------|------|
| EditableImageWrapper component | 30 min |
| MediaPickerDialog component | 1 hour |
| CourseCard integration | 30 min |
| CommunityCard integration | 30 min |
| Testing & polish | 30 min |
| **Total** | **~3 hours** |

---

## Summary

Phase 1 establishes the core infrastructure for per-card image editing:

1. **EditableImageWrapper**: A reusable overlay pattern for admin-only image editing
2. **MediaPickerDialog**: A unified picker combining upload, URL, and library selection
3. **CourseCard**: First integration - editable course cover images
4. **CommunityCard**: Second integration - editable community logos

This pattern can then be extended to WorkOrderCard, EventCard, and other cards in Phase 2 and beyond.
