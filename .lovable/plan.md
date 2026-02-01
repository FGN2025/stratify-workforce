
# Add Thumbnail Upload for Cover Images

## Overview

Enhance the SIM Game Edit Dialog to allow admins to either upload a thumbnail image or paste a URL for cover images. This follows the existing pattern used in `MediaUploadDialog`.

---

## Current State

- `SimGameEditDialog.tsx` has a simple text input for "Cover Image URL"
- `useMediaLibrary.ts` already provides an `uploadFile` mutation that handles:
  - File upload to `media-assets` storage bucket
  - Returns the public URL after upload
- `MediaUploadDialog.tsx` shows the established drag-and-drop upload pattern

---

## Implementation Plan

### 1. Update SimGameEditDialog Component

**Add upload mode toggle and file handling:**

| Addition | Description |
|----------|-------------|
| `uploadMode` state | Toggle between 'url' and 'upload' |
| `file` state | Store selected file |
| `previewUrl` state | Local preview before upload |
| `isUploading` state | Loading state during upload |
| Mode switcher UI | Buttons to switch between URL and Upload |
| Drag-and-drop zone | File input area with preview |
| File validation | Accept only image types |

**UI Layout Changes:**

```text
Cover Image
+-------------------+-------------------+
|   [URL]   |   [Upload]   |  <-- mode tabs
+-------------------+-------------------+

[URL mode]
+---------------------------------------+
| https://...                           |
+---------------------------------------+

[Upload mode]
+---------------------------------------+
|                                       |
|      [drag & drop or click]           |
|      JPG, PNG, WEBP supported         |
|                                       |
+---------------------------------------+
```

### 2. File Upload Integration

- Import `useMediaLibrary` hook for `uploadFile` mutation
- On form submit with upload mode:
  1. Upload file to `media-assets/game-covers/` folder
  2. Get returned public URL
  3. Save URL to `cover_image_url` field

### 3. File Changes

**Modified Files:**

```text
src/components/admin/SimGameEditDialog.tsx
  - Import useMediaLibrary hook
  - Add upload mode state and toggle UI
  - Add drag-and-drop file input zone
  - Add file preview display
  - Handle file upload on submit
  - Add loading state during upload
```

---

## Technical Details

### State Additions

```typescript
const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
const [file, setFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const [isUploading, setIsUploading] = useState(false);
```

### Upload Logic

```typescript
const { uploadFile } = useMediaLibrary();

const handleSubmit = async (e: React.FormEvent) => {
  let finalCoverUrl = coverImageUrl;
  
  // If in upload mode with a file, upload first
  if (uploadMode === 'upload' && file) {
    setIsUploading(true);
    finalCoverUrl = await uploadFile.mutateAsync({
      file,
      folder: 'game-covers'
    });
  }
  
  await onSave({
    ...data,
    cover_image_url: finalCoverUrl || null
  });
};
```

### UI Components

- Mode toggle buttons (URL / Upload)
- Drag-and-drop zone with visual feedback
- Image preview thumbnail
- Remove file button
- Loading spinner during upload

---

## User Experience

1. Admin opens SIM Game edit dialog
2. Scrolls to "Cover Image" section
3. Sees two tabs: "URL" (default) and "Upload"
4. **URL mode**: Paste external URL as before
5. **Upload mode**: 
   - Drag-and-drop or click to select file
   - See preview of selected image
   - Option to remove and select different file
6. On save: file uploads first, then channel updates with new URL
7. Loading indicator shows during upload process

---

## Summary

This enhancement adds thumbnail upload capability to the SIM Games Management dialog while preserving the existing URL option. It reuses the established `useMediaLibrary` upload infrastructure and follows the UI patterns from `MediaUploadDialog`.
