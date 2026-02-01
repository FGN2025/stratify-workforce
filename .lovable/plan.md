

# Learning Management System & Skill Passport Plan

## Executive Summary

This plan introduces a comprehensive Learning Management System (LMS) that transforms the platform from a simple work order tracker into a full-featured educational environment. The system will enable curriculum design, lesson sequencing, achievement tracking, point-based progression, and a verifiable **Skill Passport** that serves as a portable, tamper-evident record of a learner's competencies.

---

## Current State Analysis

### Existing Foundation

| Component | Current State | Gap |
|-----------|---------------|-----|
| **Profiles** | Basic skills (5 metrics), employability score | No progression tracking, no XP/points |
| **Work Orders** | Standalone training scenarios | No grouping into courses/syllabus |
| **Badges** | Badge definitions + user_badges linking | No automatic awarding, no display |
| **Telemetry Sessions** | Raw session data captured | No lesson completion tracking |
| **User Game Stats** | Aggregate stats per game | Not tied to curriculum progress |

### What's Missing for a Full LMS

1. **Curriculum Structure**: Courses, modules, lessons hierarchy
2. **Learning Paths**: Sequenced progression through content
3. **Lesson Content**: Rich content beyond work orders (videos, quizzes, reading)
4. **Progress Tracking**: Per-lesson and per-course completion state
5. **Point System**: XP, credits, or tokens for gamification
6. **Achievement Engine**: Automatic badge/achievement awarding
7. **Skill Passport**: Portable, verifiable credential wallet
8. **KPI Dashboard**: Performance metrics for learners and instructors

---

## Architecture Overview

```text
+-------------------+     +-------------------+     +-------------------+
|    CURRICULUM     |     |     LEARNING      |     |   SKILL PASSPORT  |
|    MANAGEMENT     |---->|     ENGINE        |---->|   (Credential     |
| (Courses/Lessons) |     | (Progress/Points) |     |    Wallet)        |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|   work_orders     |     |  user_progress    |     |  skill_passport   |
|   lessons         |     |  user_points      |     |  credentials      |
|   courses         |     |  achievements     |     |  verifications    |
|   modules         |     |  user_badges      |     |  (blockchain-     |
+-------------------+     +-------------------+     |   style hashes)   |
                                                    +-------------------+
```

---

## Database Schema

### New Tables

#### 1. `courses`
Top-level curriculum containers (e.g., "CDL Preparation Program")

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Optional organization scope |
| title | text | Course name |
| description | text | Full description |
| cover_image_url | text | Course thumbnail |
| difficulty_level | text | beginner, intermediate, advanced |
| estimated_hours | integer | Total expected hours |
| xp_reward | integer | Points awarded on completion |
| is_published | boolean | Visibility flag |
| created_at | timestamp | Creation date |

#### 2. `modules`
Course subdivisions (e.g., "Vehicle Safety Fundamentals")

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| course_id | uuid | Parent course FK |
| title | text | Module name |
| description | text | Module overview |
| order_index | integer | Sequence within course |
| xp_reward | integer | Points for module completion |

#### 3. `lessons`
Individual learning units

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| module_id | uuid | Parent module FK |
| title | text | Lesson name |
| lesson_type | text | video, reading, quiz, simulation, work_order |
| content | jsonb | Lesson content (varies by type) |
| work_order_id | uuid | Link to work order (if simulation type) |
| duration_minutes | integer | Estimated time |
| xp_reward | integer | Points for lesson completion |
| order_index | integer | Sequence within module |
| passing_score | integer | Minimum score to pass (if applicable) |

#### 4. `user_course_enrollments`
Tracks which users are enrolled in which courses

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Learner FK |
| course_id | uuid | Course FK |
| enrolled_at | timestamp | Enrollment date |
| completed_at | timestamp | Completion date (null if in progress) |
| current_module_id | uuid | Current position |
| current_lesson_id | uuid | Current position |

#### 5. `user_lesson_progress`
Individual lesson completion tracking

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Learner FK |
| lesson_id | uuid | Lesson FK |
| status | text | not_started, in_progress, completed, failed |
| score | numeric | Achievement score (if applicable) |
| attempts | integer | Number of tries |
| started_at | timestamp | First attempt |
| completed_at | timestamp | Success timestamp |
| xp_earned | integer | Points awarded |

#### 6. `user_points`
Central point/XP ledger

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Learner FK |
| points_type | text | xp, credits, tokens |
| amount | integer | Point value (positive or negative) |
| source_type | text | lesson, achievement, bonus, redemption |
| source_id | uuid | Reference to source entity |
| description | text | Human-readable reason |
| created_at | timestamp | Transaction time |

#### 7. `achievements`
Unlockable milestones beyond badges

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Achievement title |
| description | text | How to earn it |
| icon_name | text | Lucide icon identifier |
| category | text | mastery, streak, social, special |
| trigger_type | text | points, lessons, courses, time, score |
| trigger_value | jsonb | Condition parameters |
| xp_reward | integer | Points awarded |
| rarity | text | common, rare, epic, legendary |

#### 8. `user_achievements`
Earned achievements

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Learner FK |
| achievement_id | uuid | Achievement FK |
| earned_at | timestamp | When unlocked |
| metadata | jsonb | Context (e.g., which lesson triggered it) |

#### 9. `skill_passport`
Core credential wallet per user

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner FK |
| passport_hash | text | Unique verification hash |
| public_url_slug | text | Shareable URL path |
| is_public | boolean | Visibility setting |
| created_at | timestamp | Passport creation |
| updated_at | timestamp | Last modification |

#### 10. `skill_credentials`
Individual verified credentials in the passport

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| passport_id | uuid | Parent passport FK |
| credential_type | text | course_completion, certification, badge, skill_verification |
| title | text | Credential name |
| issuer | text | Issuing organization (tenant name) |
| issued_at | timestamp | Date earned |
| expires_at | timestamp | Optional expiration |
| skills_verified | text[] | Array of skill names |
| score | numeric | Achievement level (if applicable) |
| verification_hash | text | Tamper-detection hash |
| metadata | jsonb | Additional context |

---

## Feature Breakdown

### 1. Curriculum Management (Admin/Instructor)

**New Pages**:
- `/admin/courses` - Course list with CRUD
- `/admin/courses/:id/builder` - Drag-and-drop curriculum builder
- `/admin/lessons/:id/editor` - Rich lesson content editor

**Capabilities**:
- Create courses with modules and lessons
- Link existing work orders as simulation lessons
- Embed YouTube videos as video lessons
- Create quiz lessons with multiple choice questions
- Set XP rewards at each level
- Define passing criteria

### 2. Learning Experience (Student)

**New Pages**:
- `/learn` - Course catalog with enrollment
- `/learn/:courseId` - Course overview with syllabus
- `/learn/:courseId/lesson/:lessonId` - Lesson player

**Features**:
- Enroll in available courses
- Linear or flexible progression through lessons
- Video player with progress tracking
- Quiz interface with instant feedback
- Seamless launch into simulation work orders
- Progress bar and completion tracking

### 3. Points & Gamification

**XP System**:
- Earn XP for completing lessons, modules, courses
- Bonus XP for high scores (90%+ = 1.5x multiplier)
- Streak bonuses for consecutive days of learning
- Display XP prominently on profile

**Levels**:
- XP thresholds unlock levels (Novice → Expert)
- Levels displayed as badges on profile
- Level milestones unlock achievements

### 4. Achievement Engine

**Automatic Triggers**:
- First lesson completed → "First Steps" achievement
- Complete 10 work orders → "Dedicated Operator"
- Perfect score on quiz → "Perfectionist"
- 7-day learning streak → "Consistent Learner"
- Course completion → Course-specific badge

**Admin Configuration**:
- Define custom achievements with conditions
- Set rarity and XP rewards
- Enable/disable achievements per tenant

### 5. Skill Passport

**Core Features**:
- Aggregates all credentials in one place
- Unique verification hash for each credential
- Public shareable profile URL
- QR code for mobile verification
- Export to PDF with verification codes

**Credential Types**:
| Type | Source | Verification |
|------|--------|--------------|
| Course Completion | Finishing a course | Hash of user + course + date |
| Certification | Passing certification exam | Hash + optional third-party |
| Skill Badge | Achievement unlocked | Hash of badge + context |
| Work Order Mastery | High scores on work orders | Hash of telemetry summary |

**Blockchain-Style Verification**:
- Each credential has a unique hash
- Hashes are stored and can be verified against database
- Public verification endpoint for employers
- Tamper detection by recalculating hash

### 6. KPI Dashboard

**Student View** (Profile enhancement):
- Total XP and current level
- Courses in progress vs. completed
- Weekly learning streak
- Skill radar (existing, enhanced)
- Recent achievements
- Credential count

**Instructor/Admin View** (Admin enhancement):
- Class average progress
- Course completion rates
- Top performers
- At-risk learners (no activity)
- Popular courses/lessons

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CourseCard.tsx` | Course catalog | Display course preview |
| `CoursePlayer.tsx` | Course view | Full course layout |
| `LessonPlayer.tsx` | Lesson view | Content renderer by type |
| `VideoLesson.tsx` | Lesson types | YouTube/video player |
| `QuizLesson.tsx` | Lesson types | Interactive quiz |
| `SimulationLesson.tsx` | Lesson types | Work order launcher |
| `ProgressTracker.tsx` | Course view | Visual progress indicator |
| `XPDisplay.tsx` | Profile/header | Points and level badge |
| `AchievementPopup.tsx` | Global | Toast for unlocks |
| `SkillPassportView.tsx` | Profile | Credential wallet |
| `CredentialCard.tsx` | Passport | Individual credential |
| `VerificationBadge.tsx` | Credential | Verified/unverified status |
| `CurriculumBuilder.tsx` | Admin | Drag-drop course editor |
| `LessonEditor.tsx` | Admin | Content creation |

### Enhanced Existing Components

| Component | Enhancement |
|-----------|-------------|
| `Profile.tsx` | Add XP, level, credential summary, Skill Passport tab |
| `SkillRadar.tsx` | Add data from verified credentials |
| `Admin.tsx` | Add Curriculum Management tab |
| `AppSidebar.tsx` | Add "Learn" navigation item |

---

## Implementation Phases

### Phase 1: Database & Foundation (Week 1)
1. Create all new tables with migrations
2. Set up RLS policies (tenant-scoped + user-scoped)
3. Create seed data for sample courses
4. Build core hooks: `useCourses`, `useEnrollment`, `useProgress`

### Phase 2: Curriculum Management (Week 2)
1. Admin course list page
2. Course creation dialog
3. Module and lesson CRUD
4. Curriculum builder UI
5. Lesson content editors (video, quiz, work order link)

### Phase 3: Learning Experience (Week 3)
1. Course catalog page (`/learn`)
2. Course detail/syllabus view
3. Lesson player with type routing
4. Video lesson with progress tracking
5. Quiz lesson with scoring
6. Simulation lesson (work order launcher)
7. Progress saving and completion tracking

### Phase 4: Points & Achievements (Week 4)
1. Points ledger and hooks
2. XP awarding on lesson/course completion
3. Achievement definitions and triggers
4. Achievement checking engine (edge function)
5. Achievement popup notifications
6. XP display on profile header

### Phase 5: Skill Passport (Week 5)
1. Passport creation on first achievement
2. Credential generation on completions
3. Verification hash generation
4. Passport view in profile
5. Public passport page
6. QR code generation
7. PDF export functionality

### Phase 6: KPIs & Polish (Week 6)
1. Enhanced profile dashboard
2. Admin analytics dashboard
3. Instructor class progress view
4. Mobile responsiveness
5. Performance optimization
6. Documentation

---

## Security Considerations

### RLS Policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| courses | Public (published) | Admin | Admin | Admin |
| modules | Public (published) | Admin | Admin | Admin |
| lessons | Public (published) | Admin | Admin | Admin |
| user_course_enrollments | Own records | Own | Own | None |
| user_lesson_progress | Own records | Own | Own | None |
| user_points | Own records | System | None | None |
| achievements | Public | Admin | Admin | Admin |
| user_achievements | Own + Public | System | None | None |
| skill_passport | Own + Public (if shared) | Own | Own | None |
| skill_credentials | Own + Public (if shared) | System | None | None |

### Data Integrity
- Credential hashes computed server-side (edge function)
- Points awarded only through validated completions
- Achievement unlocks verified against actual progress

---

## Technical Specifications

### Verification Hash Algorithm
```
hash = SHA256(
  user_id + 
  credential_type + 
  source_id + 
  issued_at + 
  SECRET_SALT
)
```

### XP Calculation
```
base_xp = lesson.xp_reward
score_multiplier = score >= 90 ? 1.5 : score >= 80 ? 1.2 : 1.0
streak_bonus = consecutive_days > 7 ? 1.1 : 1.0
final_xp = base_xp * score_multiplier * streak_bonus
```

### Progress Calculation
```
course_progress = (completed_lessons / total_lessons) * 100
module_progress = (completed_lessons_in_module / lessons_in_module) * 100
```

---

## Success Metrics

| KPI | Target | Measurement |
|-----|--------|-------------|
| Course Completion Rate | > 60% | Completed / Enrolled |
| Avg. Lessons per Session | > 3 | Lessons per login |
| 7-Day Retention | > 40% | Return within 7 days |
| Credential Shares | > 20% | Passports made public |
| Achievement Unlock Rate | > 80% | Users with 5+ achievements |

---

## Summary

This LMS implementation transforms the platform into a comprehensive learning environment with:

- **Structured curriculum** with courses, modules, and diverse lesson types
- **Gamified progression** through XP, levels, and achievements  
- **Verified credentials** in a tamper-evident Skill Passport
- **Rich analytics** for learners and administrators
- **Seamless integration** with existing work orders and telemetry

The Skill Passport becomes a portable, verifiable record that learners can share with employers, creating real-world value from their simulation training.

