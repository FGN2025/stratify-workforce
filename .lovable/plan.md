# Game Catalog Sync — Plan

## Problem

Three gaps surfaced from your screenshot and request:

1. **Create Work Order → Game** dropdown in `WorkOrderEditDialog.tsx` (lines 473–480) is hardcoded. MSFS 2024 was wired everywhere else in Phase A but never made it into this list, and House Flipper variants don't exist anywhere yet.
2. There is no way for an admin to see what games play.fgn.gg actually exposes vs. what academy knows about.
3. Every new game today requires editing 8+ files. We want a single source of truth.

Existing inventory confirmed: `game_channels` has 7 rows aligned 1:1 with the `game_title` enum (ATS, Farming_Sim, Construction_Sim, Mechanic_Sim, Fiber_Tech, Roadcraft, MSFS_2024). No House Flipper anywhere — play side either has it or it doesn't, we'll find out from the catalog.

## Approach

Make `game_channels` the canonical "what games does academy support" list. The dropdown reads it. The new admin page diffs it against play.fgn.gg.

## Phase 1 — One-shot play.fgn.gg catalog report (build mode, no merged code)

Before adding any new enum values, I need to see what's actually on play. I'll:

- Add a temporary `action: 'games'` passthrough inside `fetch-challenges` response (it already calls it internally — just stop discarding the result), deploy, call it once with my admin token.
- Report back in chat the full list: `id`, `name`, `slug`, plus a diff column ("already on academy" / "missing").

You confirm which missing games to add (House Flipper 1, House Flipper 2, anything else worth picking up). **No enum changes yet.**

## Phase 2 — Per-game additions (one migration pair per game)

For each game you green-light, two migrations in sequence (enum-safety rule from earlier turn):

```text
M1: ALTER TYPE public.game_title ADD VALUE IF NOT EXISTS '<Enum_Name>';
M2: INSERT INTO public.game_channels (game_title, name, accent_color, description)
    VALUES ('<Enum_Name>', '<Display Name>', '<hex>', '<play_game_id reference>');
```

Enum names will follow the existing convention: `HouseFlipper_1`, `HouseFlipper_2`, etc. — PascalCase with underscore for variants. I'll propose the exact name + accent color for each before running the migrations.

## Phase 3 — Drop the hardcoded dropdown (one change, lasts forever)

**`src/components/admin/WorkOrderEditDialog.tsx`:**
- Remove the hardcoded `<SelectItem>` list (lines 474–479).
- Reuse the existing `channels` state (already loaded from `game_channels` at line 127 for the channel filter). Derive `availableGames = [...new Set(channels.map(c => ({ game_title, name })))]` and render those as `<SelectItem>` rows.
- Result: any future `game_channels` insert auto-appears in the Game dropdown with no code change.

This is the only frontend file that needs touching for the dropdown fix. The other game-aware files (`GameIcon`, `simResources`, `useGameChannelColors`, `ImportChallengeDialog.GAME_NAME_MAP`, `AppSidebar.GAME_ORDER`, `SimGamesManager`, `SimResourcesManager`, `public-catalog`) still need a per-game entry — they encode icons, colors, sidebar order, and play-name mapping that the DB doesn't carry. I'll batch those edits per game in Phase 2.

## Phase 4 — `/admin/games` sync page

New admin-only route. Lists every game on play.fgn.gg side-by-side with academy's `game_channels`:

```text
| play.fgn.gg game        | play game_id | academy enum     | status        | action          |
| Microsoft Flight Sim 24 | 7a78dd57…    | MSFS_2024        | synced        | —               |
| House Flipper 2         | abc123…      | (none)           | missing       | [Add to academy]|
| American Truck Simulator| def456…      | ATS              | synced        | —               |
```

- Read-only by default. The `[Add to academy]` button does **not** auto-write the migration (enum changes need approval); it copies a pre-filled SQL block to clipboard plus a checklist of frontend constants to update for that game. Keeps the enum-safety rule intact and keeps human review in the loop.
- Backed by a new edge function `play-games-catalog` (admin-gated, just calls `ecosystem-data-api` with `action: 'games'` and joins against academy's `game_channels`).
- Wired into Admin sidebar under SUPER ADMIN, next to "Authorized Apps".

## Acceptance

- `/admin/games` renders the diff table, shows every play game, flags missing ones.
- Create Work Order → Game dropdown lists MSFS 2024 (proves it now reads `game_channels`).
- Adding a new `game_channels` row through SQL makes the dropdown surface it without a code edit.
- One-shot report posted in chat at end of Phase 1 lists every play.fgn.gg game with its slug and id.

## Stop points

- After Phase 1 report → you pick which games to add.
- After each pair of Phase 2 migrations → I update the frontend constant maps for that game.
- After Phase 3 → screenshot confirmation that MSFS 2024 shows in the dropdown.
- After Phase 4 → demo the /admin/games page.

Ready to proceed on approval.
