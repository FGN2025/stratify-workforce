

## Plan: Build Quiz/Lesson Player for Course Content

### Problem
The 12 quiz lessons in the Challenge Enhancers course have full content (5 questions each with options, correct answers, and explanations) stored in the database, but there is **no UI to take quizzes or view lesson content**. Lessons are listed as static text in the curriculum accordion — they are not clickable and there is no lesson detail view.

### What to build

**1. New page: `src/pages/LessonDetail.tsx`**
- Route: `/learn/:courseId/lesson/:lessonId`
- Fetches lesson data including `content.questions` from the database
- Renders a quiz player for `lesson_type = 'quiz'`:
  - Displays questions one at a time (or all at once — see below)
  - Radio button selection for each answer
  - Submit button to grade the quiz
  - Shows correct/incorrect feedback with explanations after submission
  - Displays final score (e.g., 4/5) and pass/fail against `passing_score`
- For other lesson types (`reading`, `video`, `simulation`), renders appropriate content or a placeholder
- Navigation: back to course, next lesson button

**2. New hook: `src/hooks/useLessonProgress.ts`**
- `useSubmitQuiz` mutation: calculates score, upserts a row into `user_lesson_progress` with status `completed` or `failed`, score, and `xp_earned`
- `useLessonDetail` query: fetches a single lesson with its progress record
- Increments attempt count on resubmission
- Invalidates course progress queries so the curriculum view updates

**3. Update `src/pages/CourseDetail.tsx`**
- Make each lesson row clickable — navigate to `/learn/:courseId/lesson/:lessonId`
- Add hover/cursor styling to indicate interactivity
- Show lock icon for Tier 2 lessons the user cannot access (use `can_access_lesson` RPC or badge check)

**4. Update `src/App.tsx`**
- Add route: `<Route path="/learn/:courseId/lesson/:lessonId" element={<LessonDetail />} />`

**5. Fix module XP display in `CourseDetail.tsx`**
- Module `xp_reward` is 0 because XP lives on lessons. Change the display to sum lesson XP per module instead of showing `module.xp_reward`

### Quiz player UX
- All 5 questions shown on one page with radio buttons
- "Submit Quiz" button at the bottom
- After submission: each question shows green/red highlight and the explanation text
- Score summary card at top: "You scored 4/5 (80%) — Passed!" with XP earned
- "Retry" button if failed, "Next Module" button if passed
- Passing threshold comes from `lesson.passing_score` (default 70%)

### Technical details
- The `user_lesson_progress` table already exists with `status`, `score`, `xp_earned`, `attempts` columns
- Quiz content structure: `content.questions[]` with `{ id, question, options[], correct_index, explanation }`
- The badge trigger (`handle_fts_badge_completion`) fires on `user_lesson_progress` insert/update when `status = 'completed'`, so quiz completion will automatically trigger badge awards for CE-06 and CE-12
- RLS policies on `user_lesson_progress` need to be verified — the user must be able to insert/update their own progress rows

### Files created/modified
- `src/pages/LessonDetail.tsx` — new
- `src/hooks/useLessonProgress.ts` — new
- `src/pages/CourseDetail.tsx` — make lessons clickable, fix module XP
- `src/App.tsx` — add lesson route

