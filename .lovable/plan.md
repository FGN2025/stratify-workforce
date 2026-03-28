

# Apprenticeship Readiness Score (4.2)

## Problem
The Careers page currently uses a naive string-match (`c.title.toLowerCase().includes(req.split(' ')[0])`) to calculate readiness. This is fragile and inaccurate. The Profile/Passport page has no career readiness display at all.

## Approach

### 1. Create a `career_path_requirements` database table
Store career path definitions and their required credentials in the database instead of hardcoding. This allows admins to manage requirements and enables server-side readiness calculation.

```sql
CREATE TABLE career_path_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id text NOT NULL,          -- e.g. 'cdl-class-a'
  credential_match_type text NOT NULL,   -- 'credential_type', 'title_contains', 'game_title', 'skill_verified'
  match_value text NOT NULL,             -- e.g. 'Pre-Trip Inspection', 'ATS', 'safety'
  weight numeric NOT NULL DEFAULT 1,     -- relative importance (1 = standard)
  display_label text NOT NULL,           -- shown in UI: "Pre-Trip Inspection"
  created_at timestamptz DEFAULT now()
);
```

Seed it with the 5 career paths x 4 requirements each = 20 rows. RLS: public SELECT, admin ALL.

### 2. Create a `calculate_readiness` database function
A `SECURITY DEFINER` function that takes a user_id and optional career_path_id, joins `skill_credentials` against `career_path_requirements`, and returns readiness percentages per career path. Matching logic:
- `title_contains`: credential title ILIKE '%value%'
- `game_title`: credential has matching game_title
- `skill_verified`: value is in skills_verified array

Returns: `career_path_id, matched_count, total_count, readiness_pct`

### 3. Create `useCareerReadiness` hook
Calls the RPC function and returns a map of `{ [careerPathId]: { readiness, matched, total, matchedLabels } }`.

### 4. Update Careers page
- Replace the hardcoded matching logic with the hook
- Show earned vs required with check/x icons on each credential requirement
- Color the progress bar based on readiness level (red < 25%, yellow < 50%, green >= 75%)

### 5. Add Career Readiness summary to Profile page
Add a new section between Skill Radar and Credential Verification showing the user's top career paths with readiness bars. Only show paths where readiness > 0%.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `career_path_requirements` table + `calculate_readiness` function + seed data |
| `src/hooks/useCareerReadiness.ts` | New hook calling the RPC |
| `src/pages/Careers.tsx` | Replace hardcoded matching with hook, add earned/not-earned icons |
| `src/pages/Profile.tsx` | Add Career Readiness section with progress bars |

