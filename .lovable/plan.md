
# Plan: Create Sample Student Data

## Overview
Insert sample student records into the database for American Truck Simulator (ATS) and Construction Simulator to populate the Students page with demo data.

---

## Data to Create

### 1. Sample Profiles (8 students)
Create student profiles assigned to the **FGN Global** tenant (`efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca`):

| Username | Employability Score | Avatar | Skills Focus |
|----------|---------------------|--------|--------------|
| Jake_Trucker | 85 | - | ATS specialist |
| Maria_Roads | 72 | - | ATS driver |
| Sam_Diesel | 68 | - | ATS / mixed |
| Emma_Wheeler | 91 | - | Top ATS performer |
| Carlos_Builder | 78 | - | Construction specialist |
| Alex_Crane | 65 | - | Construction operator |
| Sophie_Excavator | 82 | - | Construction / mixed |
| Mike_Concrete | 70 | - | Construction worker |

### 2. Game Stats for Each Student
Create `user_game_stats` records to show play time and activity:

| Student | Game | Hours Played | Last Played |
|---------|------|--------------|-------------|
| Jake_Trucker | ATS | 45 | 2 hours ago |
| Maria_Roads | ATS | 32 | 1 day ago |
| Sam_Diesel | ATS | 28 | 3 days ago |
| Emma_Wheeler | ATS | 62 | 30 min ago |
| Carlos_Builder | Construction_Sim | 38 | 4 hours ago |
| Alex_Crane | Construction_Sim | 22 | 2 days ago |
| Sophie_Excavator | Construction_Sim | 48 | 1 hour ago |
| Mike_Concrete | Construction_Sim | 25 | 5 days ago |

---

## SQL Migration Required

```sql
-- Create sample student profiles for FGN Global tenant
INSERT INTO profiles (id, tenant_id, username, employability_score, skills)
VALUES 
  (gen_random_uuid(), 'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca', 'Jake_Trucker', 85, 
   '{"speed": 80, "safety": 88, "precision": 82, "efficiency": 85, "equipment_care": 90}'),
  (gen_random_uuid(), 'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca', 'Maria_Roads', 72,
   '{"speed": 70, "safety": 75, "precision": 68, "efficiency": 72, "equipment_care": 74}'),
  -- ... (6 more students)
  
-- Create game stats for each student
INSERT INTO user_game_stats (user_id, game_title, total_play_time_minutes, last_played_at, ...)
-- ... stats for each student
```

---

## Implementation Steps

1. **Run database migration** to insert:
   - 8 new profile records with tenant_id set to FGN Global
   - 8+ user_game_stats records linking students to ATS and Construction_Sim

2. **Data will appear automatically** - no code changes needed since `useStudents` hook already queries the database

---

## Notes

- Profile IDs will be auto-generated UUIDs (not linked to auth.users since these are demo records)
- The `last_played_at` timestamps will be set relative to current time for realistic "X hours ago" display
- Students will appear in the "Top Performers" carousel based on their employability scores
- Some students will show as "idle" or "offline" based on their last activity
