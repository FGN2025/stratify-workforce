## Assessment

**Not currently functional.** Only the explicit "Add Media" dialog (`MediaUploadDialog`) writes a `site_media` row after uploading. Every other upload path puts bytes in the `media-assets` storage bucket but **skips the `site_media` insert**, so those files never appear in the admin Media Library:

- `ImageField` (new logo/cover field)
- `MediaPickerDialog` "Upload" tab
- `MediaEditDialog` (replace-file flow)
- `SimGameEditDialog` (game cover upload)
- `TenantMediaSettings` (tenant logo)
- `media-upload` edge function (SCORM cover images written directly to `scorm-covers/`)

## Plan

Make `uploadFile` the single choke point that both stores the file **and** registers it in the library.

### 1. `src/hooks/useMediaLibrary.ts` — extend `uploadFile`
After a successful storage upload, insert a `site_media` row so the asset shows up in Media Library:
- `location_key`: generated unique value, e.g. `library/{folder}/{timestamp}-{rand}` (the table requires UNIQUE location_key, so library items get a namespaced synthetic key — slotted CMS keys like `home_hero_image` are unaffected).
- `media_type`: derive from `file.type` (`image` / `video` / `audio`; non-matching → `image` fallback).
- `title`: original `file.name`.
- `alt_text`: null (editable later from Media Library).
- `metadata`: `{ source: 'upload', folder, storage_path, size, mime_type, uploaded_by: auth.uid() }`.
- Insert failures must NOT fail the upload — log + toast a soft warning ("uploaded but not catalogued") so callers keep working even if the user lacks admin insert rights.
- Invalidate `['site-media-all']` on success.

### 2. `supabase/functions/media-upload/index.ts` — mirror the same insert
After the storage write, use the service-role client to insert a `site_media` row with `location_key = library/scorm-covers/{courseId}-{hashHex}`, `metadata = { source: 'scorm-toolkit', course_id, storage_path, bytes, mime_type }`, `upsert`-friendly via `on conflict (location_key) do update` so repeat uploads of the same content stay idempotent.

### 3. Media Library UI — surface library items
`src/components/admin/MediaLibrary.tsx`: add a "Source" filter (Slotted / Library / All) driven by `metadata.source`. Default view stays "All" so admins immediately see everything new. No schema migration required.

### 4. Out of scope
- No new tables, no RLS changes, no bucket changes.
- No backfill of files already in storage but missing from `site_media` (call that out as a follow-up if wanted).
- No change to how slotted CMS keys (`home_hero_image`, etc.) are consumed.

### Acceptance
- Uploading via `ImageField`, `MediaPickerDialog`, `MediaEditDialog`, `SimGameEditDialog`, `TenantMediaSettings`, and the `media-upload` edge function each produces a new `site_media` row visible in Admin → Media Library.
- Existing slotted entries (`home_hero_image`, etc.) continue to render unchanged.
- A non-admin uploading through a flow that allows it (if any) still gets a working URL; library registration silently degrades.
