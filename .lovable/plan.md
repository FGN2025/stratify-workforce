## Goal

House Flipper and House Flipper 2 challenges (imported from play.fgn.gg) should be grouped and surfaced under a single generic category called **Home Building**, the same way Construction Simulator and Roadcraft are grouped under **Construction**.

## How the existing system works

The project already has a generic grouping mechanism — no schema changes are needed:

- `public.sim_categories` rows carry a `default_game_titles game_title[]` array (e.g. the `construction` row is `['Construction_Sim','Roadcraft']`).
- `resolveCategoryKey(wo, categories)` in `src/hooks/useSimCategories.ts` maps any work order's `game_title` to a category via that array.
- Sidebar sections (`AppSidebar.tsx`), work-order filters (`WorkOrderFilters.tsx`), and the `/sim/:gameTitle` industry hub all consume `useSimCategories`, so a new row propagates everywhere automatically.
- Both `House_Flipper` and `House_Flipper_2` already exist as valid `game_title` enum values and there are live work orders using both.

The gap: there is no `sim_categories` row that claims those two game titles, so House Flipper work orders currently have no category home.

## Change

Insert one row into `public.sim_categories`:

- key: `home_building`
- title: `Home Building`
- subtitle: `House Flipper scenarios`
- icon_key: `home` (existing icon in `src/lib/sim-icons.ts`; if absent, fall back to `hard-hat`)
- accent_color: `#EC4899` (distinct from existing categories; adjustable)
- display_order: `35` (between Construction 30 and Mechanics 40)
- default_game_titles: `ARRAY['House_Flipper','House_Flipper_2']::game_title[]`
- deep_dive_resources: `[]::jsonb`
- is_active: `true`, `show_in_sidebar: true`, `sidebar_label: null`

This is a data insert (not a schema change), so it will be applied via the insert tool in build mode.

## Verification

1. `SELECT key, default_game_titles FROM sim_categories` shows the new `home_building` row.
2. Sidebar renders a **Home Building** entry under SIM CATEGORIES.
3. `/sim/House_Flipper` and `/sim/House_Flipper_2` resolve to the Home Building category; existing House Flipper work orders show up under it in `/work-orders` filters.
4. No changes required to icons, filters, or enums.

## Out of scope

- No new game_title enum values.
- No changes to icon set, filters, or the play.fgn.gg import path — the import already stamps `game_title` correctly; only the category mapping was missing.
- No renaming of the existing House_Flipper / House_Flipper_2 enum values.
