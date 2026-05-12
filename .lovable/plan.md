## Goal

Tidy the Admin Dashboard sidebar by collapsing the three SIM items and three Challenge items into two nested dropdowns.

## Changes (single file: `src/components/layout/AppSidebar.tsx`)

1. **Restructure `adminSubItems`** into a mixed list of plain links and groups:
   - Keep flat: Users, Events, Work Orders, Evidence Review, Media Library, Registration Codes, Skills Paths, Course Builder, Breakroom Mapper.
   - New group **SIM** (icon: `Gamepad2`): SIM Games, SIM Categories, SIM Resources.
   - New group **Challenges** (icon: `FileCheck`): Challenge Registry, Challenge Mappings, Challenge Tracks.
   - Position SIM group where SIM Games currently sits; Challenges group where Challenge Registry currently sits.

2. **Render groups as nested `<Collapsible>`** inside the existing Admin Dashboard `CollapsibleContent`:
   - Trigger styled like a `SidebarMenuButton` with chevron, indented at `pl-4` (matching admin children); children indented further (`pl-8`).
   - Independent `useState` open flags (`simOpen`, `challengesOpen`), auto-open when current route matches one of its children.
   - Hidden when sidebar is `collapsed` collapses to icon-only trigger with tooltip, same pattern as parent Admin collapsible.

3. **Active-state propagation**: parent group trigger gets `text-primary` styling when any child route is active (so the user sees which group contains the current page even when collapsed).

No route changes, no new files, no backend work. Pure sidebar UI restructure.

## Visual result

```text
Admin Dashboard ▾
  Users
  Events
  Work Orders
  Evidence Review
  SIM ▸
    SIM Games
    SIM Categories
    SIM Resources
  Media Library
  Registration Codes
  Skills Paths
  Challenges ▸
    Challenge Registry
    Challenge Mappings
    Challenge Tracks
  Course Builder
  Breakroom Mapper
  ── Super Admin ──
  …
```
