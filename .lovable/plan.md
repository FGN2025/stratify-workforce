

# Filter Career Readiness to Active Paths Only

## Problem
The Career Readiness section on the Skill Passport shows ALL five career paths (CDL, Fiber, Heavy Equipment, Ag Equipment, Diesel Mechanic) at 0% — even when the user has no engagement with most of them. Users should only see paths they are actively pursuing.

## What "participating" means
A user is participating in a career path if they have **at least one** of:
- A credential (`skill_credentials`) linked to that path's game track
- Work order progress (`user_progress`) on a work order in that path's game track
- A channel subscription (`channel_subscriptions`) for that path's game track

## Changes

### 1. Add `game_title` column to `career_path_requirements`
Each career path already maps to a game track on the frontend (`CAREER_PATHS[].gameTrack`). Store this relationship in the database so the SQL function can filter by it.

Migration:
- `ALTER TABLE career_path_requirements ADD COLUMN game_title text;`
- Update existing rows: `cdl-class-a` → `ATS`, `fiber-technician` → `Fiber_Tech`, `heavy-equipment-operator` → `Construction_Sim`, `ag-equipment-tech` → `Farming_Sim`, `diesel-mechanic` → `Mechanic_Sim`

### 2. Update `calculate_readiness` function
Add a CTE that finds the user's active game tracks (from `user_progress` joined to `work_orders`, or from `skill_credentials`). Then filter `career_path_requirements` to only those game tracks.

### 3. Frontend — hide 0% paths as fallback
In both `Profile.tsx` and `Careers.tsx`, filter the readiness map to only show paths where `readinessPct > 0` OR the user has activity. Since the SQL now handles this, the frontend just renders what it gets — but add a guard to skip rendering empty results.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `game_title` to `career_path_requirements`, update seed data, rewrite `calculate_readiness` to filter by user's active game tracks |
| `src/pages/Profile.tsx` | No change needed if SQL filters correctly; optionally hide section when map is empty |
| `src/pages/Careers.tsx` | Same — relies on filtered hook data |

