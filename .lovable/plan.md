## Goal

One admin-controlled mapping drives both surfaces:
- **Sidebar "SIM CATEGORIES"** — currently hardcoded game names (Trucking Simulator, Fiber-Tech Simulator).
- **Work Orders filter chips** — already DB-driven industry names (Trucking & Logistics, Broadband).

After this change, an admin can rename "Trucking Simulator" → "Trucking & Logistics" in one place and both surfaces update. Game-level external resource links (CDL Quest, CDL Exchange, etc.) stay attached to the game, not the industry.

## Current state (for reference)

- `sim_categories` table — industry name, icon, color, `default_game_titles[]`, display order. Edited in Admin → Sim Categories. Drives `/work-orders` filters.
- `src/config/simResources.ts` — hardcoded `SIM_RESOURCES[gameTitle]` with title + icon + color + external resource list. Drives sidebar SIM CATEGORIES section and external resource cards.
- Gap: two parallel naming systems, no mapping between them.

## Design

### 1. Add a sidebar label override to sim_categories

Migration adds two optional columns to `public.sim_categories`:
- `sidebar_label text` — what the sidebar shows (falls back to `title` when null).
- `show_in_sidebar boolean default true` — lets admin hide an industry from the sidebar without deleting it.

No data migration needed; existing rows just inherit `title` as the sidebar label.

### 2. New "Sim Category Mapping" admin view

Extend `SimCategoriesManager` (Admin → Sim Categories) so each category card shows:
- Industry name (existing `title`)  — used on Work Orders filter chips.
- Sidebar label (new `sidebar_label`) — used on sidebar. Defaults to industry name; admin can override (e.g., set industry = "Trucking & Logistics", sidebar = "Trucking Simulator", or align them).
- "Show in sidebar" toggle.
- Default games (existing `default_game_titles[]`) — the mapping itself.

Result: one row per industry holds both names and the game mapping. Renaming or remapping a game requires no code change.

### 3. Rewrite the sidebar SIM CATEGORIES section

`src/components/layout/AppSidebar.tsx`:
- Stop iterating `SIM_RESOURCES` for the sidebar list.
- Iterate `useSimCategories()` rows where `show_in_sidebar = true`, ordered by `display_order`.
- Label = `sidebar_label ?? title`. Icon/color = `icon_key`/`accent_color` from the row.
- Each row links to `/sim/:gameTitle`. When a category maps to multiple games (e.g., Construction covers Construction_Sim + Roadcraft), expand into sub-items per game using `SIM_RESOURCES[gameKey].shortTitle` for the sub-label.
- Game channels with no sim_category mapping still get an auto-appended sidebar entry (existing behavior preserved as a fallback so new games appear automatically).

### 4. Keep `SIM_RESOURCES` for game-scoped data only

`src/config/simResources.ts` stays, but its role narrows to per-game data the DB doesn't own:
- `shortTitle`, icon component, external resource cards (CDL Quest, CDL Exchange).
- Sidebar no longer reads `title` from it.
- `WorkOrderFilters.tsx` "uncategorized game" chip fallback continues to read from it.

We are **not** moving external resource links into the DB in this pass — only the naming and mapping.

## Technical details

### Migration

```sql
ALTER TABLE public.sim_categories
  ADD COLUMN sidebar_label text,
  ADD COLUMN show_in_sidebar boolean NOT NULL DEFAULT true;
```

Update `useSimCategories.ts` to surface both fields on `SimCategory`.

### Files touched

- `supabase/migrations/<new>.sql` — schema addition above.
- `src/hooks/useSimCategories.ts` — add `sidebar_label`, `show_in_sidebar` to the returned object.
- `src/hooks/useSaveSimCategory.ts` — include the two new fields in upsert payload.
- `src/components/admin/SimCategoriesManager.tsx` — show sidebar label + toggle on each card.
- `src/components/admin/SimCategoryEditDialog.tsx` — add inputs for `sidebar_label` and `show_in_sidebar`.
- `src/components/layout/AppSidebar.tsx` — replace the static `SIM_RESOURCES` loop in the SIM CATEGORIES group with a `useSimCategories()`-driven loop; preserve the game-channel fallback for unmapped games.
- No changes to `WorkOrderFilters.tsx`, `simResources.ts`, or any edge function.

### Backward compatibility

- Existing rows: `sidebar_label` null → sidebar shows current `title` ("Trucking & Logistics", "Broadband", etc.). If the user prefers the old game names on the sidebar, they set `sidebar_label` per row in admin.
- Routes (`/sim/:gameTitle`) and game-channel auto-discovery unchanged.
- `SIM_RESOURCES` keeps providing icons, short titles, and external resource cards.

## Out of scope

- Migrating external resource links (CDL Quest, etc.) from `simResources.ts` into the DB.
- Renaming the `GameTitle` enum or changing how work orders are tagged.
- Touching `play.fgn.gg` naming.

## Result

- Single admin surface controls every industry/game label users see in this app.
- Sidebar and Work Orders filters can be aligned (matching names) or intentionally divergent (game name on sidebar, industry on filter) — admin choice, no code edit.
- New industries or remappings ship without a deploy.
