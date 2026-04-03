

# Migration: Add unique constraint to `user_work_order_completions`

The `breakroom_identity` table already exists (migration `20260403174327`), so re-creating it would fail. The only remaining change is the unique constraint on `user_work_order_completions`.

## What will be done

A single migration adding:

```sql
ALTER TABLE public.user_work_order_completions
  ADD CONSTRAINT uq_user_work_order
  UNIQUE (user_id, work_order_id);
```

This enables the `breakroom-lms-sync` edge function to use `.upsert(..., { onConflict: 'user_id,work_order_id' })` correctly.

## Technical Details

| Item | Detail |
|------|--------|
| **File** | New migration via database migration tool |
| **Table** | `public.user_work_order_completions` (already has indexes on both columns) |
| **Change** | Add `UNIQUE(user_id, work_order_id)` constraint |
| **Risk** | Will fail if duplicate rows already exist — the constraint enforces one completion record per user per work order |

No UI or code changes.

