

## Add Roadcraft as a Separate Game Title

### Why
Roadcraft challenges span multiple skill domains (fiber installation, flood damage assessment, route planning, project management) that don't all belong under Fiber-Tech. A dedicated `Roadcraft` enum value gives admins flexibility to assign work orders to the appropriate category.

### Changes

**1. Database migration — add `Roadcraft` to `game_title` enum**
```sql
ALTER TYPE public.game_title ADD VALUE IF NOT EXISTS 'Roadcraft';
```

**2. Revert the Roadcraft → Fiber_Tech mapping in ImportChallengeDialog**
- Change `'Roadcraft': 'Fiber_Tech'` to `'Roadcraft': 'Roadcraft'` in `GAME_NAME_MAP`

**3. Update every hardcoded game-title list across ~15 files**

Each file below has a `Record<GameTitle, ...>` or `GameTitle[]` that needs a `Roadcraft` entry:

| File | What to add |
|------|-------------|
| `src/types/tenant.ts` | Add `'Roadcraft'` to `GameTitle` union |
| `src/components/dashboard/GameIcon.tsx` | Add `Roadcraft` config (icon: `Gamepad2` or `Map`, label: `'Roadcraft'`) |
| `src/hooks/useGameChannelColors.ts` | Add default color (e.g. `'#22C55E'` green) |
| `src/components/admin/WorkOrderEditDialog.tsx` | Add `<SelectItem value="Roadcraft">Roadcraft</SelectItem>`, revert Fiber_Tech label to just `"Fiber-Tech Simulator"` |
| `src/components/admin/SimGameEditDialog.tsx` | Add to `allGameTitles`, `gameLabels`, `gameIcons` |
| `src/components/admin/SimGamesManager.tsx` | Add to `GAME_ICONS` and `GAME_LABELS` |
| `src/components/admin/SimResourcesManager.tsx` | Add to `GAME_CONFIG` |
| `src/components/admin/SimResourceEditDialog.tsx` | Add to game options array |
| `src/components/admin/EventsManager.tsx` | Add to `GAME_LABELS` |
| `src/components/admin/ChallengesTab.tsx` | Add to `GAME_LABELS` |
| `src/components/admin/CredentialTypesManager.tsx` | Add `'Roadcraft'` to `GAME_TITLES` array |
| `src/components/work-orders/ChannelSubscribeButton.tsx` | Add to `GAME_NAMES` |
| `src/components/layout/AppSidebar.tsx` | Add `'Roadcraft'` to `GAME_ORDER` |
| `src/config/simResources.ts` | Add `Roadcraft` config block |
| `src/pages/WorkOrders.tsx` | Add `fiberTechWorkOrders` and `roadcraftWorkOrders` filtered arrays + hero stats |
| `src/pages/Leaderboard.tsx` | Add to `GAME_TITLES` |
| `supabase/functions/public-catalog/index.ts` | Add `Roadcraft` to game metadata |

**4. Revert Fiber_Tech labels back to "Fiber-Tech Simulator"**
Files that were changed to say "Fiber-Tech / Roadcraft" will revert to just "Fiber-Tech Simulator" since they are now separate categories.

### What stays the same
- No data migration needed — no existing work orders use `Roadcraft` yet (they were mapped to `Fiber_Tech`)
- No RLS changes
- Sidebar will auto-populate via the existing `game_channels` database query once an admin creates a Roadcraft channel in SIM Games

