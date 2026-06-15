
# Convergence Pass — Approved Scope

Preflight confirmed: `work_order_tasks.source_task_id` is **nullable** (text). Safe to write null. Scope counts: 14 imported rows missing tasks, 5 rows with `play_source.requires_evidence=true` AND `evidence_requirements IS NULL`.

---

## Phase A — Forward-fixes (ship in one batch, no data writes)

**Gap 1: `play_source` on INSERT** (additive, 2 files)
- `src/components/admin/ImportChallengeDialog.tsx`:
  - Add `play_source?: Record<string, unknown>` to `ExternalChallenge` and `MappedChallengeData`.
  - Forward `play_source: challenge.play_source` from `handleSelect`.
- `src/components/admin/WorkOrderEditDialog.tsx`:
  - Hold `pendingPlaySource` in state, set from `handleImportChallenge(data)`.
  - On create-path INSERT only: `metadata: pendingPlaySource ? { play_source: pendingPlaySource } : null`. Edit path untouched.

**Gap 3a: `display_order` → `order_index` mapping fix**
- `src/components/admin/ImportChallengeDialog.tsx`:
  - Rename `ExternalTask.order_index` → `display_order` (match upstream truth).
- `src/components/admin/WorkOrderEditDialog.tsx` task insert:
  - Use `order_index: t.display_order ?? idx`. Upstream order wins; array index is fallback only.
- Silent bug on all imports; this fixes it forward.

**Gap 2: evidence auto-prefill on import**
- `src/components/admin/WorkOrderEditDialog.tsx`:
  - When `pendingPlaySource?.requires_evidence === true` and admin hasn't toggled, prefill `evidenceRequired = true` with platform-standard defaults:
    ```
    { min_uploads: 1, max_uploads: 5, allowed_types: ['image','video','document'], instructions: '', deadline_hours: null }
    ```
  - Admin override stays authoritative.

No migrations, no schema changes, no edge function changes. Confirm "Phase A shipped, byte-safe" after the edits compile.

---

## Phase B — Data backfills (dry-run first, hold for approval)

**Task backfill (scope: all 14)**
- Extend `supabase/functions/backfill-play-source/index.ts` with a `mode: 'tasks'` branch (or new sibling function `backfill-work-order-tasks`), reusing the cached `fetch-challenges` snapshot pattern.
- Targets: all 14 work orders with `fgn_origin_challenge_id IS NOT NULL` AND zero `work_order_tasks` rows.
- For each, read upstream `tasks[]` from the cached snapshot.
- Skip rows with zero upstream tasks (legitimately empty; report them).
- Per-task row: `{ work_order_id, title, description, order_index: t.display_order ?? idx, source_task_id: null }`.
- **Dry-run report:** for each of 14 rows: `{ wo_id, title, upstream_task_count, would_skip: bool, tasks: [...] }`. Hold for approval.

**Evidence backfill (conditional, today's matches: 5)**
- Same function or a sibling `backfill-evidence-requirements` branch.
- Targets: `fgn_origin_challenge_id IS NOT NULL` AND `metadata->'play_source'->>'requires_evidence' = 'true'` AND `evidence_requirements IS NULL`.
- Write the platform-standard JSONB above.
- **Dry-run report:** the 5 rows with the JSONB that would be written. Hold for approval.

Both Phase B writes are gated on explicit "approve write" from user. Re-runnable later for more rows once `play_source` is swept platform-wide.

---

## Parked (noted, not this pass)
- 35 of 41 work orders still lack `play_source` entirely. Run the existing `backfill-play-source` unscoped in a future pass; evidence conditional backfill will then pick up additional rows automatically.
- Upstream tasks have no `id` today → `source_task_id` stays null as known limitation.

---

## Execution order
1. Switch to build mode → ship Phase A (3 changes across 2 files).
2. Build Phase B backfill function(s), run **dry-run only**, report payloads.
3. Wait for user approval on each Phase B write.
