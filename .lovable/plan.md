

# Admin Media Management Plan

## Overview

This plan adds a comprehensive media library to the Admin Dashboard that allows administrators to manage all visual and audio assets across the platform from a central location. This includes hero images, game cover images, video embeds (YouTube), card images, and any other media files used throughout the site.

---

## Current Media Landscape

The platform currently has hardcoded media in several locations:

| Location | Current Media | File |
|----------|---------------|------|
| Home Hero | Unsplash industrial image | `HeroSection.tsx` |
| Game Cover Images | 4 hardcoded game images | `EventCard.tsx` |
| Page Hero Backgrounds | Unsplash images per page | `PageHero.tsx`, various pages |
| Game Channels | `cover_image_url` field exists | Database (`game_channels` table) |
| Tenants/Communities | `logo_url` field exists | Database (`tenants` table) |

---

## Architecture

```text
+------------------+     +------------------+     +------------------+
|   Media Library  |---->|  Storage Bucket  |---->|   CDN / Public   |
|   (Admin UI)     |     |  (media-assets)  |     |   URLs           |
+------------------+     +------------------+     +------------------+
        |
        v
+------------------+     +------------------+
|  site_media      |<----|  Media Selector  |
|  (config table)  |     |  (Component)     |
+------------------+     +------------------+
```

---

## Database Schema

### New Table: `site_media`

A configuration table to store references to media used in specific platform locations:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `location_key` | text | Unique identifier for where media is used (e.g., `home_hero`, `ats_cover`) |
| `media_type` | text | Type of media: `image`, `video`, `youtube`, `audio` |
| `url` | text | Public URL or YouTube video ID |
| `alt_text` | text | Accessibility description |
| `title` | text | Display title for admin reference |
| `metadata` | jsonb | Additional data (dimensions, duration, etc.) |
| `is_active` | boolean | Whether this media is currently in use |
| `created_at` | timestamp | Creation date |
| `updated_at` | timestamp | Last modified date |

### Storage Bucket: `media-assets`

A public storage bucket for uploaded media files:
- Organized by category: `heroes/`, `covers/`, `cards/`, `videos/`, `audio/`
- Public access for serving content
- Admin-only upload/delete permissions

---

## Location Keys

Predefined media slots that can be managed:

| Key | Description | Media Type |
|-----|-------------|------------|
| `home_hero_image` | Main homepage hero background | image |
| `home_hero_video` | Optional video for homepage hero | youtube |
| `ats_cover` | American Truck Simulator cover image | image |
| `farming_sim_cover` | Farming Simulator cover image | image |
| `construction_sim_cover` | Construction Simulator cover image | image |
| `mechanic_sim_cover` | Mechanic Simulator cover image | image |
| `leaderboard_hero` | Leaderboard page background | image |
| `profile_hero` | Profile page background | image |
| `students_hero` | Students page background | image |
| `work_orders_hero` | Work Orders page background | image |
| `promo_video_1` | Featured promotional video | youtube |

---

## Admin UI Components

### 1. Media Library Tab

Add a new "Media" tab to the Admin Dashboard with:

**Gallery View**
- Grid of all uploaded media with thumbnails
- Filter by type (images, videos, audio)
- Search by title or location
- Upload button for new assets

**Detail Panel**
- Preview of selected media
- Edit title, alt text, metadata
- See where media is used
- Delete with confirmation

### 2. Media Upload Dialog

A modal for uploading new media:
- Drag and drop or click to select
- Supported formats: JPG, PNG, WEBP, MP4, MP3
- Auto-generate thumbnails for video
- Set title and alt text on upload
- Choose destination folder

### 3. Site Media Manager

A dedicated section showing all "slots" in the platform:
- Visual grid of all configurable media locations
- Current media thumbnail for each slot
- Click to change/upload new media
- Quick preview of how it appears on site

### 4. YouTube Embed Manager

For video content:
- Paste YouTube URL to extract video ID
- Preview embed before saving
- Set autoplay, loop, muted options
- Thumbnail preview

---

## Component Updates

### Updated `HeroSection.tsx`

Replace hardcoded image with dynamic lookup:

```typescript
const { data: heroMedia } = useQuery({
  queryKey: ['site-media', 'home_hero_image'],
  queryFn: () => supabase
    .from('site_media')
    .select('url')
    .eq('location_key', 'home_hero_image')
    .eq('is_active', true)
    .single()
});
```

### Updated `EventCard.tsx`

Replace hardcoded cover images with database lookup:

```typescript
const { data: gameCoverImages } = useQuery({
  queryKey: ['game-covers'],
  queryFn: () => supabase
    .from('site_media')
    .select('location_key, url')
    .in('location_key', ['ats_cover', 'farming_sim_cover', ...])
});
```

### New `useSiteMedia` Hook

A reusable hook for fetching media by location:

```typescript
function useSiteMedia(locationKey: string) {
  return useQuery({
    queryKey: ['site-media', locationKey],
    queryFn: () => fetchMediaByKey(locationKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
```

---

## New Files to Create

### File Structure

```text
src/
  components/
    admin/
      MediaLibrary.tsx        (main gallery view)
      MediaUploadDialog.tsx   (upload modal)
      MediaCard.tsx           (individual media item)
      SiteMediaManager.tsx    (location slots manager)
      YouTubeEmbedForm.tsx    (YouTube URL handler)
  hooks/
    useSiteMedia.ts           (fetch media by location)
    useMediaLibrary.ts        (CRUD operations)
```

---

## Admin Dashboard Integration

Add a new card/tab to the Admin page:

```text
Admin Dashboard
├── Hero Stats
├── Platform Analytics
├── User Management
└── [NEW] Media Library
    ├── All Media (gallery)
    ├── Site Locations (slots)
    └── Upload New
```

---

## Security

### RLS Policies for `site_media`

| Action | Policy |
|--------|--------|
| SELECT | Public read (anyone can view media URLs) |
| INSERT | Admins only |
| UPDATE | Admins only |
| DELETE | Admins only |

### Storage Policies for `media-assets` Bucket

| Action | Policy |
|--------|--------|
| SELECT | Public (for serving files) |
| INSERT | Admins only |
| UPDATE | Admins only |
| DELETE | Admins only |

---

## Implementation Order

1. **Database**: Create `site_media` table with RLS policies
2. **Storage**: Create `media-assets` bucket with permissions
3. **Seed Data**: Insert default media records for existing hardcoded images
4. **Hook**: Create `useSiteMedia` hook for fetching
5. **MediaLibrary Component**: Build gallery with upload capability
6. **SiteMediaManager**: Build location slots interface
7. **YouTube Handler**: Add video embed support
8. **Update HeroSection**: Replace hardcoded image
9. **Update EventCard**: Replace hardcoded game covers
10. **Update PageHero usages**: Make backgrounds configurable

---

## Media Locations Summary

### Hero Images (5 locations)
- Home hero background
- Leaderboard hero background
- Profile hero background
- Students hero background
- Work Orders hero background

### Game Cover Images (4 locations)
- ATS cover
- Farming Simulator cover
- Construction Simulator cover
- Mechanic Simulator cover

### Video Content (expandable)
- Homepage demo video (YouTube)
- Promotional videos

### Future Expansion
- Audio files for notifications
- Badge icons
- Community banners
- Channel hero images

---

## UI/UX Design

The Media Library will follow the existing admin aesthetic:

| Element | Style |
|---------|-------|
| Gallery Grid | 4-column responsive grid with thumbnails |
| Upload Zone | Dashed border drag-and-drop area |
| Media Cards | Glass-card style with hover preview |
| Filters | Pills for image/video/audio types |
| Actions | Consistent with existing admin buttons |

