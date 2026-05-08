## Workstream A — Course Builder UI catches up to v0.1 contract
## Workstream B — DB-driven challenge↔lesson mapping

Sequenced so DB migration lands first (B-schema), then edge function update, then both UIs in parallel.

---

### Step 1 — Migration: `challenge_lesson_mappings`

New table:
- `id uuid pk`, `play_challenge_id text not null`, `lesson_id uuid not null references lessons(id) on delete cascade`
- `notes text`, `is_active boolean default true`, `created_by uuid`, `created_at`, `updated_at`
- `unique (play_challenge_id, lesson_id)`, partial index on `is_active = true`
- RLS: admins manage all; authenticated read active rows
- `play_challenge_id` is text (no cross-project FK enforcement, per flag)

### Step 2 — Edge function: `sync-challenge-completion`
Replace hardcoded `CHALLENGE_LESSON_MAP` with a query against `challenge_lesson_mappings` filtered by `play_challenge_id` and `is_active = true`, returning `lesson_id[]`. Add 60s in-memory TTL cache keyed by challenge id. Per-lesson XP grant semantics (each mapped lesson grants its own `xp_reward`) called out explicitly in the commit message. Hard redeploy after.

### Step 3 — Admin UI: Challenge↔Lesson Mappings
New tab under existing admin (`ChallengeLessonMappingsTab.tsx`):
- List view: play_challenge_id, lesson title (joined), notes, active toggle, edit/delete
- `ChallengeLessonMappingDialog.tsx`: Combobox for play_challenge_id sourced from `work_orders.fgn_origin_challenge_id` distinct values + free-text fallback; Combobox for lesson (course → module → lesson hierarchy); notes textarea
- Hook: `useChallengeLessonMappings.ts` (list/create/update/delete via supabase client)

### Step 4 — Course Builder v0.1 contract types
Extend `src/types/course-types.ts`:
- `ScormBuildRequest`: add `dryRun?: boolean`, `briefingHtml?: Record<lessonId, string>`, `quizQuestions?: Record<lessonId, QuizQuestion[]>`
- Discriminated `ScormBuildResponse`: `{status:'preview',...}` | `{status:'ok', courseId, manifestUrl,...}` | `{status:'error', code, issues?: ValidationIssue[]}`
- `ValidationIssue { path: string; code: string; message: string; severity: 'error'|'warning' }`
- Path parser regex `/(\w[\w-]*)|\[(\d+)\]/g` (per A1 flag)

### Step 5 — CourseBuilder refactor: 3-state machine
`Configure → Preview → Published`
- **Configure**: existing form → submit calls `dryRun: true`, transitions to Preview with returned manifest
- **Preview**: render PreviewPane with editable BriefingEditor (rich text, client DOMPurify pinned to server's 6-tag allowlist per A3) and QuizQuestionEditor per lesson (CRUD; new questions get `crypto.randomUUID()`); "Re-preview" re-runs `dryRun:true` with current overrides; "Publish" runs without `dryRun`
- **Published**: success summary, link to course
- Use `coverImageRemoteUrl` over `coverImageUrl` when present (A2)
- Handle no-quiz / no-briefing courses gracefully (A2)
- `beforeunload` + react-router blocker for unsaved overrides (A2)
- ValidationSummary surfaces `issues[]`; click on issue scrolls preview pane to mapped field; client filters `QUIZ_PLACEHOLDER_NEEDS_AUTHORING` and `ENHANCER_NO_OUTPUT` as defense-in-depth (server already filters)

### Step 6 — Supporting components
`src/components/admin/course-builder/`:
- `PreviewPane.tsx`
- `BriefingEditor.tsx` (sanitized rich text, 6-tag allowlist)
- `QuizQuestionEditor.tsx`
- `ValidationSummary.tsx`

### Step 7 — Smoke
End-to-end: preview → edit briefing + quiz → re-preview → publish → manually trigger sync-challenge-completion against a row in the new mappings table; confirm XP grant fires per mapped lesson.

---

### Out of scope
Multi-work-order curriculum authoring, work-order backfilling, `game_title` on trigger-issued credentials, auto-pull of play participants. Version-row trigger for cache invalidation deferred unless admins report stale lookups.

### Files touched
- New migration
- `supabase/functions/sync-challenge-completion/index.ts`
- `src/types/course-types.ts`
- `src/components/admin/CourseBuilder.tsx` (refactor)
- `src/components/admin/course-builder/*` (4 new)
- `src/components/admin/ChallengeLessonMappingsTab.tsx` + dialog
- `src/hooks/useChallengeLessonMappings.ts`
- Admin page route to mount the new tab
