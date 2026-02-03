

# Plan: Add File Upload to Media Edit Dialog

## Overview

Enhance the `MediaEditDialog` component to allow administrators to replace existing media assets by uploading a new file, not just by changing the URL manually. This brings the edit experience in line with the create experience in `MediaUploadDialog`.

## Current State

| Dialog | File Upload | URL Entry | YouTube |
|--------|-------------|-----------|---------|
| MediaUploadDialog (Add New) | Yes | Yes | Yes |
| MediaEditDialog (Edit Existing) | No | Yes | N/A |

## Proposed Enhancement

Add file upload capability to MediaEditDialog with a toggle between "Replace with File" and "Edit URL" modes.

## UI Design

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Edit Media                                │
│  Update media details for "home_hero_image"                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 [Current Image Preview]                    │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────┬─────────────────┐                          │
│  │  [Upload File]  │  [Enter URL]    │  ◄─ Mode toggle tabs    │
│  └─────────────────┴─────────────────┘                          │
│                                                                  │
│  If "Upload File" selected:                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │    ⬆️ Drag and drop or click to upload                    │  │
│  │       JPG, PNG, WEBP, MP4, MP3 supported                  │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  If "Enter URL" selected:                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  URL: https://example.com/new-image.jpg                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Title: [Hero Background Image                              ]   │
│  Alt Text: [Scenic industrial landscape                     ]   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Location Key: home_hero_image                            │  │
│  │  Type: image                                              │  │
│  │  Status: Active                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                            [Cancel]  [Save Changes]              │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Changes to MediaEditDialog.tsx

1. **Add mode state**: Toggle between `'url'` and `'upload'` modes
2. **Add file handling**: File state, preview URL generation, drag & drop support
3. **Add folder selection**: When uploading, allow folder selection (same as MediaUploadDialog)
4. **Integrate uploadFile mutation**: Use existing hook from `useMediaLibrary`
5. **Handle submit logic**: 
   - If mode is 'upload' and file selected: Upload file first, then update media record with new URL
   - If mode is 'url': Update media record directly with new URL (existing behavior)

### File to Modify

| File | Changes |
|------|---------|
| `src/components/admin/MediaEditDialog.tsx` | Add upload mode with drag & drop, file preview, folder selection, and upload handling |

### Features

- **Mode Toggle**: Button group to switch between "Upload File" and "Enter URL"
- **Drag & Drop Zone**: Same pattern as MediaUploadDialog for consistency
- **File Preview**: Show new file preview when selected (before saving)
- **Folder Selection**: Choose storage folder when uploading replacement file
- **File Validation**: Size limits (20MB for media), type validation
- **Loading States**: Show spinner during file upload and save operations
- **Error Handling**: Toast notifications for upload failures

### Upload Flow

1. User clicks "Edit" on a media card
2. Dialog opens with current preview and URL
3. User clicks "Upload File" tab
4. User drags/drops or selects a new file
5. Preview updates to show the new file
6. User selects destination folder (optional, default based on media type)
7. User clicks "Save Changes"
8. System uploads file to storage bucket
9. System updates `site_media` record with new URL
10. Success toast + dialog closes

### Code Pattern

The implementation will reuse patterns from:
- `MediaUploadDialog.tsx`: Drag & drop zone, file handling, preview generation
- `TenantMediaSettings.tsx`: Simpler file upload pattern with validation

### Validation Rules

- **File size**: Max 20MB for images/videos
- **File types**: `image/*`, `video/*`, `audio/*`
- **Required fields**: Title must not be empty
- **URL validation**: If URL mode, must be non-empty string

### Folder Options (same as MediaUploadDialog)

| Folder | Use Case |
|--------|----------|
| heroes | Hero background images |
| covers | Game/course cover images |
| cards | Card thumbnails |
| videos | Video files |
| audio | Audio files |
| misc | Other files |

## Technical Considerations

1. **Old file cleanup**: The old file in storage will NOT be automatically deleted when replaced (storage cleanup is a separate concern)
2. **YouTube media**: File upload mode will be hidden for YouTube media type (only URL edit makes sense)
3. **Existing hook**: Uses the existing `uploadFile` mutation from `useMediaLibrary` - no backend changes needed

