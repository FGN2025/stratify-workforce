

# Wire Leaderboard to Real Database Data

## Current State
The leaderboard uses a hardcoded `mockLeaderboard` array with fake names and scores. Meanwhile, the database has **8 real profiles** with `employability_score`, `user_game_stats` (play time, best scores, sessions), and `user_points` (XP) data.

## Plan

### 1. Create a `useLeaderboard` hook
**File: `src/hooks/useLeaderboard.ts`**

Query profiles joined with aggregated `user_game_stats` and `user_points` to build the leaderboard:
- Fetch all profiles with `employability_score`
- Fetch `user_game_stats` aggregated per user (total hours, best score)
- Fetch total XP per user via `get_user_total_xp` RPC
- Rank by `employability_score` descending
- Identify the current logged-in user via `useAuth()`
- No "change" column for now (requires historical snapshots we don't have) — show a dash instead

### 2. Update `Leaderboard.tsx` to use real data
**File: `src/pages/Leaderboard.tsx`**

- Remove the `mockLeaderboard` constant
- Call `useLeaderboard()` hook
- Update the `LeaderboardEntry` interface to include `userId` and `avatarUrl`
- Replace hardcoded `'Marcus Johnson'` checks with `entry.userId === user?.id`
- Update hero stats to show actual user rank and score
- Add loading skeleton while data fetches
- Add `avatar_url` to the Avatar components

### 3. Add `change` field stub
Since we have no historical rank data, set `change: 0` for all entries. The UI will show a neutral dash. This can be enhanced later with weekly snapshots.

## Data Mapping

| UI Field | DB Source |
|----------|-----------|
| Username | `profiles.username` |
| Score | `profiles.employability_score` |
| Hours | `SUM(user_game_stats.total_play_time_minutes) / 60` |
| Avatar | `profiles.avatar_url` |
| Rank | Computed from score ordering |
| "You" label | `entry.userId === auth.uid()` |

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useLeaderboard.ts` | New hook — queries profiles + game stats |
| `src/pages/Leaderboard.tsx` | Replace mock data with hook, add loading state |

