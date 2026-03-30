

# Configurable Career Readiness Thresholds

## Summary
Replace the hardcoded 75% readiness threshold with a per-career-path configurable value stored in the database. Users below the threshold see training bridge recommendations. Users at or above it are flagged as "advancement ready."

## Database Change

Add a `min_readiness_pct` column to the existing `career_path_requirements` grouping. Since requirements are per-path but there's no `career_paths` table, we need a small lookup table:

**New table: `career_paths`**

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | text (PK) | — | e.g. `cdl-class-a`, `fiber-technician` |
| min_readiness_pct | integer | 75 | Configurable threshold per path |
| training_bridge_url | text (nullable) | — | External training link (e.g. broadbandworkforce.com) |
| training_bridge_label | text (nullable) | — | Display name for the link |

This gives admins a single place to tune each path's gate and associated training link.

**RLS**: Public SELECT, admin ALL.

## Frontend Changes

### `src/pages/Careers.tsx`
- Fetch `career_paths` table alongside requirements
- Use `min_readiness_pct` from DB instead of hardcoded 75%
- Show "Recommended Training" card when user's readiness is **below** the path's threshold
- Show "Ready to Advance" badge when user's readiness is **at or above** the threshold

### `src/pages/Profile.tsx`
- Same logic for the Career Readiness section on the Skill Passport — use per-path thresholds

### Admin (optional future)
- The `career_paths` table is admin-editable, so thresholds can be adjusted without code changes

## Logic

```text
For each career path the user is active in:
  if readiness_pct >= career_path.min_readiness_pct → show "Ready to Advance" badge
  if readiness_pct < career_path.min_readiness_pct  → show training bridge link
```

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `career_paths` table, seed rows with default 75% threshold and training URLs |
| `src/pages/Careers.tsx` | Fetch thresholds from `career_paths`, replace hardcoded 75%, render training bridge cards |
| `src/hooks/useCareerReadiness.ts` | No change — readiness calculation stays the same, threshold comparison is UI-side |

