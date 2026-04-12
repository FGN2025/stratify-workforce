

## Plan: Remove Time Indicators, Keep Only XP

### Files to modify

**1. `src/pages/CourseDetail.tsx`**
- Remove the `Clock` icon import
- Remove the `{course.estimated_hours}h estimated` stat block (lines 139-142)
- Change lesson display from `{lesson.duration_minutes}min · {lesson.xp_reward} XP` to just `{lesson.xp_reward} XP` (line 248)

**2. `src/components/learn/CourseCard.tsx`**
- Remove the `Clock` import
- Remove the estimated hours display block (lines 102-105)
- Keep only the XP display

**3. `src/pages/Leaderboard.tsx`**
- Remove `{entry.hours}h played` from top-3 podium cards (line 51)
- Remove the "Hours" column header from the leaderboard table (line 221)
- Remove the hours data column (lines 257-259)
- Adjust grid from `grid-cols-12` with 5 columns to 4 columns (Rank, Operator, Score, XP) with updated `col-span` values

**4. `src/pages/Profile.tsx`**
- Remove `{ value: stats.totalHours + 'h', label: 'Total Hours' }` from the stats array (line 184)

**5. `src/components/profile/ProfileHeader.tsx`**
- Remove the "Total Hours" stat block with Clock icon (lines 101-107)
- Adjust grid from `grid-cols-4` to `grid-cols-3` (or keep 4 if there are exactly 4 remaining stats)

**6. `src/components/admin/AdminStatsGrid.tsx`**
- Replace "Sessions This Week" stat with an XP-based stat (e.g., "Total XP Awarded" or keep as-is since it's session count, not time) — will keep this one since it's a count metric, not a time indicator. No change needed.

### Technical details
- The `estimated_hours` and `duration_minutes` fields remain in the database schema and TypeScript types — we only remove their display from the UI
- The `useProfile` hook's `totalHours` computation stays but is unused; can be cleaned up
- The leaderboard `hours` field from `useLeaderboard` stays in the hook but won't render

### Summary
Six display locations across 5 files where time/duration is shown to users. All will be removed or replaced, keeping XP as the sole progress metric.

