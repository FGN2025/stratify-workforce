

# Task-Level Challenge Progress Sync — Gap Assessment & Plan

## Current State

**What exists today:**
- Work orders are global (visible to all users) — **no gap here**
- `sync-challenge-completion` records an overall pass/fail per attempt in `user_work_order_completions` (score, xp_awarded, status)
- The `success_criteria` field on work orders is a simple JSON blob (`{min_score: 80, max_damage: 5}`) — no individual task breakdown
- play.fgn.gg challenges have granular **tasks** (e.g., "25 Excellent Deliveries", "25 On-Time Deliveries", "2500 Mile Delivery") as shown in the screenshot — these are NOT synced today

**Gaps identified:**
1. **No task-level data model** — there's no table to store individual challenge tasks or per-user task progress
2. **No task data in sync payload** — `sync-challenge-completion` only accepts `score`, `skills_verified`, and generic `metadata`
3. **No task progress UI** — the Work Order Detail page shows `success_criteria` as key/value pairs, not as trackable tasks with individual completion status
4. **No task import** — `fetch-challenges` pulls challenge metadata but not the sub-tasks from play.fgn.gg

## Plan

### 1. New Database Tables (2 migrations)

**`work_order_tasks`** — defines the individual tasks within a work order (imported from challenge tasks on play.fgn.gg):
- `id`, `work_order_id` (FK), `title`, `description`, `order_index`, `source_task_id` (from play.fgn.gg), `created_at`
- RLS: readable by all authenticated users, writable by admins

**`user_task_progress`** — tracks per-user, per-task completion:
- `id`, `user_id`, `work_order_task_id` (FK), `work_order_id` (FK), `is_completed`, `completed_at`, `evidence_url`, `metadata`, `created_at`, `updated_at`
- RLS: users can read/write their own rows; admins can read all

### 2. Update `fetch-challenges` Edge Function

- Also query `challenge_tasks` (or equivalent table) from play.fgn.gg alongside challenges
- Return tasks nested under each challenge so the import dialog can preview them

### 3. Update Import Flow

- When a challenge is imported as a work order, also insert its tasks into `work_order_tasks` with the `source_task_id` link
- Update `ImportChallengeDialog` to show task count in the challenge list
- Update `WorkOrderEditDialog` to display imported tasks (read-only) and allow manual task addition

### 4. Update `sync-challenge-completion` Endpoint

Extend the payload to accept task-level progress:
```text
{
  user_email: string,
  challenge_id: string,
  score?: number,
  skills_verified?: string[],
  task_progress?: [                    // NEW
    { task_id: string, completed: boolean, completed_at?: string }
  ],
  metadata?: Record<string, unknown>
}
```

The function will:
- Match each `task_id` to a `work_order_tasks` row via `source_task_id`
- Upsert `user_task_progress` records for the user
- Continue existing logic for overall completion/XP/credentials

### 5. Update Work Order Detail Page

- Fetch `work_order_tasks` for the current work order
- Fetch `user_task_progress` for the current user
- Render a task checklist (similar to the play.fgn.gg UI in image-26) showing each task with completion status, replacing the generic `success_criteria` key/value display
- Show progress bar based on tasks completed / total tasks

### 6. Update Skill Passport

- Include task-level completion data in credential metadata so the passport reflects granular achievement detail
- The credential issued by `sync-challenge-completion` already stores `metadata` — populate it with task completion summary

### 7. Update Integration Guide

- Update `/mnt/documents/play-fgn-gg-integration-guide.md` with the new `task_progress` payload format

## Files Changed

| File | Change |
|------|--------|
| New migration | Create `work_order_tasks` and `user_task_progress` tables with RLS |
| `supabase/functions/fetch-challenges/index.ts` | Also fetch challenge tasks from play.fgn.gg |
| `src/components/admin/ImportChallengeDialog.tsx` | Show task count; pass tasks to import handler |
| `src/components/admin/WorkOrderEditDialog.tsx` | Insert tasks on import; display task list |
| `supabase/functions/sync-challenge-completion/index.ts` | Accept & process `task_progress` array |
| `src/pages/WorkOrderDetail.tsx` | Render task checklist with per-user progress |
| `src/hooks/useWorkOrderCompletion.ts` | Add hook for fetching task progress |
| `/mnt/documents/play-fgn-gg-integration-guide.md` | Document new `task_progress` payload |

## Testing

Test with user Darcy (`darcylorincz@gmail.com`):
1. Import a challenge with tasks (e.g., Podium Challenge with its 5 tasks)
2. Send a sync call from play.fgn.gg with `task_progress` data
3. Verify task-level progress appears on the Work Order Detail page
4. Confirm credential in Skill Passport includes task completion detail

## Dependency Note

This plan assumes play.fgn.gg has a `challenge_tasks` table (or similar) accessible via their anon key. If that table doesn't exist or has a different name, we'll need the play.fgn.gg team to confirm the schema. The screenshots show tasks exist in their UI, so the data should be queryable.

