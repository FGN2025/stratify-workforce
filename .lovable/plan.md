
# Plan: Add Skill Passport Links to Students Page

## Overview
Enable admins to navigate directly to any student's Skill Passport (profile page) from the Students management view. This also requires replacing the mock data with real database records.

---

## Changes Required

### 1. Create `useStudents` Hook
**New file: `src/hooks/useStudents.ts`**

Fetch real student data from the database:
- Query the `profiles` table for users in the current tenant
- Join with `user_game_stats` to get total hours and last activity
- Join with `telemetry_sessions` to detect active sessions
- Calculate trend data from recent score changes

### 2. Update Students Page
**File: `src/pages/Students.tsx`**

- Replace mock data with the new `useStudents` hook
- Add navigation to `/profile/:userId` when clicking a student row
- Add explicit "View Passport" link in the actions column
- Replace the non-functional "MoreVertical" button with a dropdown menu containing:
  - "View Skill Passport" - navigates to `/profile/:userId`
  - "Send Message" (placeholder for future)
  - "View Activity" (placeholder for future)

### 3. UI Enhancements
- Make the entire row clickable to view the student's profile
- Add hover state feedback to indicate clickability
- Include a direct "View Passport" button/link for quick access
- Add loading and empty states for real data

---

## Technical Details

### Data Flow
```text
profiles table
    |
    +-- user_game_stats (total_play_time_minutes, last_played_at)
    |
    +-- telemetry_sessions (active session detection)
    |
    v
useStudents hook --> Students.tsx --> Link to /profile/:userId
```

### Query Strategy
```sql
-- Fetch students with stats
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.employability_score,
  p.updated_at,
  COALESCE(SUM(ugs.total_play_time_minutes), 0) as total_minutes,
  MAX(ugs.last_played_at) as last_active
FROM profiles p
LEFT JOIN user_game_stats ugs ON ugs.user_id = p.id
WHERE p.tenant_id = :current_tenant_id
GROUP BY p.id
```

### Navigation Implementation
```typescript
// Row click handler
const handleRowClick = (studentId: string) => {
  navigate(`/profile/${studentId}`);
};

// Or using Link component
<Link to={`/profile/${student.id}`}>
  View Skill Passport
</Link>
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useStudents.ts` | Create | Hook to fetch real student data with stats |
| `src/pages/Students.tsx` | Modify | Replace mock data, add navigation links |

---

## User Experience

**Before:**
- Static mock data
- No way to view student profiles
- Non-functional actions button

**After:**
- Real student data from database
- Click any row to view that student's Skill Passport
- Dropdown menu with "View Skill Passport" action
- Clear visual feedback on hover

---

## Edge Cases Handled

- Empty state when no students exist
- Loading state while fetching data
- Students without game stats (new users)
- Graceful fallback for missing usernames/avatars
