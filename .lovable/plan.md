

# Add Game Filter to Leaderboard

## Overview
Add a tab-based game filter to the leaderboard so students can view rankings for "All Games" or a specific simulation game (Trucking, Farming, Construction, Mechanic, Fiber-Tech). The filter uses the existing `game_title` column in `user_game_stats`.

## Changes

### 1. Update the database function to accept an optional game filter
**Migration: new `get_leaderboard_data` with `_game_title` parameter**

Replace the existing RPC with one that accepts an optional `text` parameter. When `NULL` or `'all'`, it returns the global leaderboard (current behavior). When a specific game title is passed, it filters `user_game_stats` to only that game's hours/scores and only returns users who have stats for that game.

### 2. Update `useLeaderboard` hook to accept a game filter
**File: `src/hooks/useLeaderboard.ts`**

- Accept an optional `gameFilter: GameTitle | 'all'` parameter
- Pass it to the RPC call
- Include the filter in the `queryKey` so React Query caches per-game results separately

### 3. Add game filter tabs to `Leaderboard.tsx`
**File: `src/pages/Leaderboard.tsx`**

- Add a row of filter tabs above the Top Operators section: "All Games" + one tab per game (using `GameIcon` component for visual consistency with the rest of the app)
- Store selected game in local state, default to `'all'`
- Pass selected game to `useLeaderboard(gameFilter)`
- Update the hero stats subtitle to reflect the active filter
- Import `GameIcon` and `SIM_RESOURCES` config for game labels/colors

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | `CREATE OR REPLACE FUNCTION get_leaderboard_data(_game_title text DEFAULT NULL)` |
| `src/hooks/useLeaderboard.ts` | Add `gameFilter` parameter, pass to RPC |
| `src/pages/Leaderboard.tsx` | Add game filter tabs UI, wire to hook |

