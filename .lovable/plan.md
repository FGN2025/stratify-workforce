# Auto-derived Work Orders filters + sidebar entries for new games

**Approved decision:** auto-provisioned `game_channels` rows will also appear as sidebar SIM CATEGORIES entries.

## Root cause recap

- Work Orders filter bar is built from `useSimCategories()` (the `sim_categories` table). Only 5 curated rows exist (trucking / agriculture / construction / mechanics / broadband). `House_Flipper`, `House_Flipper_2`, `MSFS_2024` aren't referenced in any row, so no filter chip is rendered.
- Sidebar SIM CATEGORIES list is hard-coded in `AppSidebar.tsx` (`GAME_ORDER`), so new games don't appear there either.
- The import flow (`fetch-challenges` → `WorkOrderEditDialog`) never touches `sim_categories` or `game_channels`, so new games never auto-register.

## Fix

### 1. Seed missing channel rows (done)
Inserted `game_channels` rows for `House_Flipper`, `House_Flipper_2`, `MSFS_2024` (no-op on conflict). Existing channels untouched.

### 2. Auto-upsert `game_channels` from the import flow
Edit `supabase/functions/fetch-challenges/index.ts`: after fetching the play games catalog, upsert a `game_channels` row for every `(game_title_enum, name)` pair returned by play, with `ON CONFLICT (game_title) DO NOTHING`. Only enum values that already exist in `game_title` are inserted (unknown values are skipped — those require an enum migration). Result: opening the Import Challenges dialog auto-registers any newly-supported game.

### 3. Data-driven filter chips
- New hook `src/hooks/useGameChannels.ts` returns all `game_channels` rows (name, accent_color).
- `WorkOrderFilters.tsx`: accept `uncategorizedGameTitles: GameTitle[]` and render a chip per entry with `value="game:<GameTitle>"`. Icon/color from `game_channels` first, `SIM_RESOURCES` second, generic `Gamepad2` last.
- `WorkOrders.tsx`: compute uncategorized list = `game_channels.game_title` ∪ `DISTINCT work_orders.game_title` minus every `sim_categories.default_game_titles`. Extend the filter predicate so `game:<GameTitle>` matches `wo.game_title`. Counts populated under the same `game:<GameTitle>` key.

### 4. Data-driven sidebar SIM CATEGORIES
- `AppSidebar.tsx`: replace static `GAME_ORDER` with a derived list: static order first (preserves the curated ordering of ATS → Fiber_Tech → Roadcraft → Farming → Construction → Mechanic → MSFS_2024), then append any `game_channels.game_title` not already in the static list. Each entry still uses `SIM_RESOURCES[gameTitle]` for icon/resources; new games without a SIM_RESOURCES entry fall back to a generic icon and "Coming Soon" body. House_Flipper and House_Flipper_2 already have SIM_RESOURCES entries, so they render with their pink HardHat icon immediately.

## Acceptance

- Reload `/work-orders`: a House Flipper and a House Flipper 2 chip appear after the 5 SIM-category chips, with counts. Clicking either filters to those work orders only. Existing chips and counts unchanged.
- Sidebar SIM CATEGORIES shows House Flipper and House Flipper 2 entries (after the existing 7) with their accent color from `game_channels`.
- After any future challenge import for a brand-new game (whose enum value already exists), opening the import dialog auto-creates the channel and the chip + sidebar entry appear on next page load.
- No `sim_categories` rows touched. No `work_orders` rows touched. `game_channels` gains the 3 seed rows + any future upserts.

## Files

- `src/hooks/useGameChannels.ts` (new)
- `src/components/work-orders/WorkOrderFilters.tsx`
- `src/pages/WorkOrders.tsx`
- `src/components/layout/AppSidebar.tsx`
- `supabase/functions/fetch-challenges/index.ts`
- One data seed (already applied to DB).
