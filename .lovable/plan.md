

# Plan: SIM Resources Admin Dashboard Control

## Overview

This plan adds a new Admin Dashboard tab for managing SIM Resources - the external links and multimedia content associated with each simulator game. This will replace the current static configuration with a database-driven approach, allowing admins to add, edit, and remove resources with associated media.

---

## Current Architecture

| Component | Current State |
|-----------|---------------|
| Resource Data | Hardcoded in `src/config/simResources.ts` |
| Media | Separate `site_media` table (images, videos, audio, YouTube) |
| Game Channels | Database-driven via `game_channels` table |
| Sidebar | Reads from static config file |

---

## Proposed Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Existing Tabs:                    New Tab:                      │
│  ┌─────────────┐                  ┌─────────────────────────┐   │
│  │ SIM Games   │                  │ SIM Resources           │   │
│  │ (metadata)  │                  │                         │   │
│  └─────────────┘                  │  • Add/Edit/Delete      │   │
│  ┌─────────────┐                  │  • Link to Media        │   │
│  │ Media       │                  │  • Per-Game Grouping    │   │
│  │ Library     │─────────────────▶│  • Drag-to-Reorder      │   │
│  └─────────────┘  References      │                         │   │
│                                   └─────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  sim_resources │ (New Table)
                    │  table         │
                    │                │
                    │  - game_title  │
                    │  - title       │
                    │  - description │
                    │  - href        │
                    │  - icon_name   │
                    │  - media_id FK │
                    │  - sort_order  │
                    └───────────────┘
```

---

## Database Changes

### New Table: `sim_resources`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `game_title` | game_title enum | Which simulator (ATS, Farming_Sim, etc.) |
| `title` | text | Resource name (e.g., "CDL Quest") |
| `description` | text | Short description |
| `href` | text | External URL |
| `icon_name` | text | Lucide icon name (e.g., "graduation-cap") |
| `accent_color` | text | Hex color for styling |
| `media_id` | uuid (nullable) | Reference to site_media for thumbnail |
| `sort_order` | integer | Display order within game |
| `is_active` | boolean | Visibility toggle |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last update time |

### RLS Policies

- **SELECT**: Anyone can read active resources
- **INSERT/UPDATE/DELETE**: Admin only (via `has_role` function)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/SimResourcesManager.tsx` | Main manager component with CRUD |
| `src/components/admin/SimResourceEditDialog.tsx` | Add/Edit dialog with form |
| `src/hooks/useSimResources.ts` | Data fetching and mutations |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Add new "SIM Resources" tab |
| `src/config/simResources.ts` | Optionally read from DB with static fallback |
| `src/components/layout/AppSidebar.tsx` | Use database resources with fallback |

---

## Component Details

### SimResourcesManager.tsx

Features:
- Grid/List view of resources grouped by game
- Filter by game type (ATS, Farming Sim, etc.)
- Search by title/description
- Add new resource button
- Edit/Delete/Toggle active per resource
- Drag-and-drop reordering within game category
- Link to associated media thumbnails

### SimResourceEditDialog.tsx

Form fields:
- **Game Title**: Dropdown (required)
- **Title**: Text input (required)
- **Description**: Textarea (required)
- **URL**: Text input with validation (required)
- **Icon**: Icon picker dropdown (Lucide icons)
- **Accent Color**: Color picker
- **Thumbnail**: Media picker (links to Media Library)
- **Active**: Toggle switch

### useSimResources.ts Hook

```text
Exports:
- useSimResources(gameTitle?: GameTitle) - Fetch resources, optionally filtered
- useAllSimResources() - Fetch all for admin
- useSimResourceMutations() - Create, update, delete, reorder
```

---

## UI Design

### Resource Card Layout

```text
┌────────────────────────────────────────┐
│  [Thumbnail]  │  CDL Quest             │
│               │  Complete CDL curriculum│
│  🎓          │  with structured paths  │
│               │                         │
│               │  [Edit] [Delete] [Toggle]│
└────────────────────────────────────────┘
```

### Grouped View by Game

```text
┌─────────────────────────────────────────────────┐
│ American Truck Simulator                   [+Add]│
├─────────────────────────────────────────────────┤
│  [CDL Quest Card]  [CDL Exchange Card]          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Farming Simulator                          [+Add]│
├─────────────────────────────────────────────────┤
│  No resources yet. Click Add to create one.     │
└─────────────────────────────────────────────────┘
```

---

## Integration with Existing Systems

### Media Library Integration

The edit dialog includes a "Select Thumbnail" button that:
1. Opens a media picker showing existing Media Library items
2. Filters to images only
3. Allows selecting an existing image or uploading a new one
4. Stores the `media_id` reference

### Sidebar Dynamic Loading

Update `AppSidebar.tsx` to:
1. Call `useSimResources()` hook
2. Fall back to static config if no database entries
3. Group resources by game_title
4. Render with database order

---

## Migration Strategy

### Phase 1: Database Setup
- Create `sim_resources` table with migration
- Add RLS policies for admin access
- Seed initial data from current static config

### Phase 2: Admin UI
- Build SimResourcesManager component
- Build SimResourceEditDialog
- Add tab to Admin page

### Phase 3: Dynamic Sidebar (Optional)
- Update sidebar to read from database
- Keep static config as fallback for initial load

---

## Technical Notes

- Leverages existing patterns from `MediaLibrary` and `SimGamesManager`
- Uses `@tanstack/react-query` for data fetching
- Icon picker uses Lucide icon set (same as rest of app)
- Accent color uses existing color picker pattern
- Media picker reuses `site_media` infrastructure

---

## Summary

This enhancement moves SIM Resources from static configuration to a fully managed database system, enabling admins to:
- Add new external resource links for any simulator game
- Attach multimedia (thumbnails, preview videos) to resources
- Control visibility and ordering
- Manage content without code deployments

