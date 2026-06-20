
# Inline image field with drag/drop + URL for admin configurators

Today the Community Setup wizard (Identity step) and the Settings logo field accept only a raw URL. Other admin surfaces (Work Order edit, Sim Game edit, Community form) already use `MediaPickerDialog`, which supports upload, drag/drop, URL, library, and AI generation — but only behind a "Pick image" button. The user wants drag/drop and inline upload directly on the field itself, applied consistently wherever images are configured.

## Approach

Create one reusable field component and reuse it everywhere images are configured. No backend changes — uploads continue to go through the existing `useMediaLibrary.uploadFile` mutation into the `media-assets` bucket.

### New component: `src/components/admin/ImageField.tsx`

A single self-contained input with:
- Square/rectangular preview (variant: `logo` square ~96px, `cover` 16:9) showing current image or empty drop-zone state.
- Drag-and-drop anywhere on the preview area. Drop handler accepts a single `image/*` file, calls `uploadFile.mutateAsync({ file, folder })`, then calls `onChange(url)`. Shows a spinner overlay during upload.
- "Upload" button (file picker) — same upload path.
- "Browse library" button that opens the existing `MediaPickerDialog` (full upload / URL / library / AI tabs) and writes the chosen URL back through `onChange`.
- URL text input always visible below the preview so admins can still paste a link (and see/copy what's stored).
- "Remove" button when an image is set, clears to empty string.

Props:
```ts
{
  value: string;
  onChange: (url: string) => void;
  label: string;
  variant?: 'logo' | 'cover';   // controls preview aspect
  folder?: string;              // upload folder, default 'community'
  workOrderId?: string;         // pass-through to MediaPickerDialog AI tab
}
```

### Wire-in points (scope: configurators)

- `src/components/admin/setup/steps/IdentityStep.tsx` — replace the two raw `<Input>`s with `<ImageField variant="logo" folder="community-logos" />` and `<ImageField variant="cover" folder="community-covers" />`.
- `src/pages/Settings.tsx` (line 59 — community logo URL field) — replace with `<ImageField variant="logo" />` wired to the existing tenant logo state.

No changes to `WorkOrderEditDialog`, `SimGameEditDialog`, `CommunityFormDialog`, etc. — they already invoke `MediaPickerDialog`, which already supports drag/drop inside the dialog. Leaving them unchanged keeps this PR focused; if you want the drag-drop-on-field affordance there too later, swap their picker button for `ImageField` in a follow-up.

## Acceptance

- On `/admin/community-setup` step 1, both Logo and Cover Image show a preview tile. Dragging an image file onto the tile uploads it and stamps the resulting public URL into the field. The URL input still works for paste-in URLs. "Browse library" opens the existing picker with all four tabs (Upload / URL / Library / AI).
- On `/settings` the community logo field behaves the same.
- Saving the community setup persists the uploaded URL into `tenants.logo_url` / `tenants.cover_image_url` (unchanged write path).

## Out of scope

- Backend / RLS / bucket policy changes (existing `media-assets` bucket and `useMediaLibrary` upload path are reused).
- Refactoring surfaces that already use `MediaPickerDialog`.
