
## Part 1 — `import-challenge-as-workorder` edge function

Create `supabase/functions/import-challenge-as-workorder/index.ts`.

**Auth**: bearer token → `auth.getUser` → `has_role(user, 'admin')`. 403 otherwise. CORS preflight. Validates body with Zod.

**Input**:
```json
{ "challenge_ids": ["<uuid>", ...] }   // 1..50
```

**Per challenge** (service-role client):
1. Idempotency: `select id from work_orders where fgn_origin_challenge_id = $1`. If found → record `{challenge_id, work_order_id, status: "existing"}` and skip.
2. Pull the canonical challenge by invoking the already-deployed `fetch-challenges` once at the start of the call (forwarding the admin bearer), index by `id`. This reuses the same play_source enrichment + difficulty/game mapping pipeline the dialog uses — no parallel mapper.
3. Apply the same maps that live in `ImportChallengeDialog` (`GAME_NAME_MAP`, `DIFFICULTY_MAP`) — these are duplicated into the function (small, stable). Result = the same `MappedChallengeData` shape the dialog builds.
4. Build the **identical 15-column create payload** the dialog writes (lines 251–271 of `WorkOrderEditDialog.tsx`):
   - `title: null` (resolver-driven)
   - `description`, `game_title`, `difficulty`, `xp_reward`, `estimated_time_minutes`, `max_attempts: null`, `success_criteria: null`, `is_active: false` (import default), `channel_id: null`, `tenant_id: null`, `evidence_requirements` (auto-prefill when `play_source.requires_evidence === true`, same defaults as dialog), `cover_image_url`, `fgn_origin_challenge_id`
   - **`metadata: { play_source: <snapshot> }` set on the INSERT itself** — preserves Phase A convergence-by-construction. Single insert, no post-update.
5. Side effect A — `game_channels` upsert keyed on `game_title` (`onConflict: 'game_title', ignoreDuplicates: true`), with `name`/`accent_color` from `SIM_RESOURCES`. The function imports `SIM_RESOURCES` from a copy committed alongside it (Deno can't reach `src/`); we'll copy the small constant into `supabase/functions/_shared/sim-resources.ts` and import from both sides so there's still one source — frontend re-exports the shared file.
6. Side effect B — insert `work_order_tasks` from `tasks[]`: `{ work_order_id, title, description, order_index: display_order ?? idx, source_task_id: t.id }`.

**Output**:
```json
{
  "results": [
    { "challenge_id": "...", "work_order_id": "...", "status": "created" | "existing",
      "tasks_imported": 4, "play_source_present": true }
  ]
}
```
Returns 200 with per-item status (partial failures captured as `status: "error", error: "..."`).

**Dialog refactor** (`WorkOrderEditDialog.tsx`): when in create-mode AND `fgnOriginChallengeId` is set (i.e. user clicked Import), replace the inline insert/upsert/tasks block with a single `supabase.functions.invoke('import-challenge-as-workorder', { body: { challenge_ids: [fgnOriginChallengeId] } })` call, then `onSave()`. The manual-create path (no challenge id) keeps the existing inline insert — the edge function is challenge-import only, matching its name. This gives us: **dialog import path → edge function**, **configurator → same edge function**. Plain manual work-order creation stays in the dialog (no behavior change, no regression risk).

`supabase/config.toml`: add `[functions.import-challenge-as-workorder] verify_jwt = false` (auth validated in code, matching `fetch-challenges`).

---

## Part 2 — Assessment storage report (no migration needed, with caveats)

**Tables already exist on academy:**

- **`simulations`** — one row per assessment, FK `work_order_id → work_orders(id) ON DELETE CASCADE`. Key cols: `wo_code` (unique), `sim_id_external`, `title`, `sim_type` (**CHECK in `('sequence','loadout')`**), `briefing/facts/cats/config` (jsonb), `track_key`, `status` (`draft` default), `tenant_id`.
- **`simulation_items`** — items per assessment. Cols: `simulation_id`, `item_key` (unique with sim), `cat_key`, `name`, `sub`, `display_order`, **`correct boolean`**, **`critical boolean`**, **`seq integer`** (sequence order), **`why text`**. Matches the dev-order item shape exactly.
- **`simulation_runs`** — per-user attempt ledger. Cols: `user_id`, `simulation_id`, `work_order_id`, `archetype` (CHECK `('sequence','loadout')`), `raw/max/percent`, `grade`, `stand_down`, `item_selections jsonb`, `critical_hits jsonb`, `debrief jsonb`. RLS: service-role writes; users read own.

**Archetype gap (only real blocker):**
- Dev order specifies three archetypes: `resource_selection`, `method_selection`, `sequence`.
- DB currently allows two: `sequence`, `loadout`.
- Mapping: `sequence` → `sequence`; `loadout` ≈ `resource_selection`. **`method_selection` has no slot.** Both CHECK constraints (`simulations.sim_type` and `simulation_runs.archetype`) need to expand.

**Tiny provisioning migration** (proposed, runnable on request — not part of Part 1 ship):
```sql
ALTER TABLE simulations DROP CONSTRAINT simulations_sim_type_check;
ALTER TABLE simulations ADD CONSTRAINT simulations_sim_type_check
  CHECK (sim_type IN ('sequence','resource_selection','method_selection','loadout'));
ALTER TABLE simulation_runs DROP CONSTRAINT simulation_runs_archetype_check;
ALTER TABLE simulation_runs ADD CONSTRAINT simulation_runs_archetype_check
  CHECK (archetype IN ('sequence','resource_selection','method_selection','loadout'));
```
(Keeps `loadout` for back-compat with existing rows; adds the two new archetypes.) No new tables needed.

**Write path for the Configurator** (recommendation, not built in this ticket): a sibling admin-authorized edge function `attach-assessment-to-workorder` that accepts `{ work_order_id, sim_type, title, wo_code, briefing, facts, cats, config, items: [...] }` and does a 2-step write (`simulations` upsert by `wo_code` + `simulation_items` insert). Same admin-auth pattern. Flag this in the report; do NOT build it in this PR unless approved — Part 1 is the explicit Part 1.

**Skill Passport recording path** (confirmed live):
`score-simulation` edge function → inserts `simulation_runs` row → calls `sync-challenge-completion` with `{user_email, challenge_id: simulations.fgn_origin_challenge_id-via-work_order, score, metadata: { simulation_id, run_id, stand_down }}`. `sync-challenge-completion` ensures `skill_passport` exists and writes a `skill_credentials` row (`credential_type: 'skill_verification'`, `external_reference_id` keyed on completion). So: **assessment attempt → simulation_runs → sync-challenge-completion → skill_credentials on the user's skill_passport**. Same ledger course completions use.

---

## Deliverables in this PR
1. New file `supabase/functions/import-challenge-as-workorder/index.ts`.
2. New file `supabase/functions/_shared/sim-resources.ts` (copy of SIM_RESOURCES — frontend re-exports).
3. `src/config/simResources.ts` re-exports from the shared file (no behavior change).
4. `supabase/config.toml` entry for the new function.
5. `WorkOrderEditDialog.tsx` create-branch: when `fgnOriginChallengeId` is set, invoke the edge function instead of writing inline. Manual create path unchanged.
6. Report (this plan) covers Part 2 — no schema change in this PR; archetype-expand migration listed as a one-line follow-up gated on approval.

## Out of scope
- The `attach-assessment-to-workorder` write function (proposed, awaiting go-ahead).
- Archetype CHECK migration (proposed above, awaiting go-ahead).
- Any Configurator-side code.
