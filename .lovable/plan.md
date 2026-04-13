

# Plan: Standardize Terminology to "Course" and Remove Lesson Counts

## Problem
1. The CourseDetail page shows "X modules · Y lessons" counts that are redundant given the 1:1 module-to-lesson structure
2. The term "lesson" appears inconsistently across the UI — sometimes mixed with "course" in the same view

## Terminology Decision

Agree that **"course"** is the right user-facing term. In this platform's structure, each accordion item in the curriculum is one learning unit, and "course" is more intuitive for the workforce training audience. Internal code can keep `lesson` in variable names and DB columns, but all **user-visible text** should use "course."

## Changes

### 1. `src/pages/CourseDetail.tsx`
- **Line 145**: Remove `{course.modules?.length || 0} modules · {totalLessons} lessons` — replace with just XP display
- **Line 163**: Change `{completedLessons}/{totalLessons} lessons` to `{course.progress || 0}%` only (progress bar already shows percentage)
- **Lines 214-217**: Module accordion subtitle — remove `{moduleLessons.length} lesson(s)`, keep only `{XP} XP` and completion count

### 2. `src/pages/LessonDetail.tsx`
- **Line 47**: "Lesson not found" → "Course not found"
- **Line 137**: "Next Lesson" → "Next Course"
- **Line 230**: "This {type} lesson content" → "This {type} course content"

### 3. `src/components/learn/EnrolledCourses.tsx`
- No changes needed — already uses "course" terminology throughout

### 4. `src/components/learn/CourseCard.tsx`
- No changes needed — already uses "course" terminology

### 5. `src/pages/Learn.tsx`
- No changes needed — already uses "course" terminology

## What stays unchanged
- DB column names (`lesson_type`, `lesson_id`, etc.) — no schema changes
- Hook names and internal variable names — code-level only
- Route paths (`/lesson/:lessonId`) — changing URLs would break bookmarks

