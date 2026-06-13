## Corrections folded in (reference `scoreRun()` / `gradeFor()` are normative)

1. **Grade bands** — distance-from-max, top-down, exact names:
   - `score ≥ max − 20` → **JOB READY**
   - `score ≥ max − 60` → **ALMOST CREW-READY**
   - `score ≥ max − 110` → **GREEN APPRENTICE**
   - else → **BACK TO THE YARD**
   - **Stand-down overrides everything** and uses the per-sim `critFailGrade` + `critFailLine` carried in `simulations.config` jsonb from the seed JSON. No generic "Stand-Down" label.

2. **Critical semantics** — inclusion is the violation, in both archetypes:
   - Loadout: critical item picked → `−25` + `stand_down=true`.
   - Sequence: critical step added anywhere in the flow → `−25` + `stand_down=true`.
   - Placement is irrelevant for critical.
   - Critical items are always `correct=false`, never required. `simulation_items.critical` column comment reflects this.

3. **Percent** — `percent = max(0, round(raw / max × 100))`. `round`, not `floor`. Stand-down forces `0`. Matches the deployed WO-2690 sync contract at the 70 gate.

4. **No `required` column** — studio model treats `correct` as required. Drop the column. Seed JSON carries `correct, critical, seq, why` + display fields (`name, sub, icon, cat`). Scoring uses `correct` as the single concept.

## Phase A — what merges first (this approval)

### A1. Migration: add MSFS 2024 as a game

```sql
ALTER TYPE public.game_title ADD VALUE 'MSFS_2024';
-- + game_channels row anchored to play.fgn.gg
--   (name 'Microsoft Flight Simulator 2024', accent_color '#0EA5E9',
--    play_game_id 7a78dd57-9061-47d3-9ee7-436a48aba2f6, slug 'msfs-2024')
```

I'll inspect `game_channels` columns before writing the insert so the anchor lands in the right field (column vs. jsonb).

### A2. Frontend wiring for `MSFS_2024` (additive, no other game touched)

- `src/components/dashboard/GameIcon.tsx` — add `MSFS_2024` (Plane icon, sky-blue `text-sky-400 bg-sky-500/20`).
- `src/config/simResources.ts` — add `MSFS_2024` block, empty `resources` (matches Farming / Construction / Mechanic).
- `src/hooks/useGameChannelColors.ts` — add `MSFS_2024: '#0EA5E9'` to `DEFAULT_COLORS`.
- `src/components/admin/ImportChallengeDialog.tsx` — extend `GAME_NAME_MAP` with `'Microsoft Flight Simulator 2024' → 'MSFS_2024'` (+ alias `'MSFS 2024'`).
- `supabase/functions/public-catalog/index.ts` — append MSFS to the games list emitted by the public catalog (counts default to 0 until Phase B lands).

### A3. Confirm `fgn_origin_challenge_id` stamping — no patch needed

Verified path: `ImportChallengeDialog.handleSelect` → `MappedChallengeData.fgnOriginChallengeId = challenge.id` → `WorkOrderEditDialog.handleImportChallenge` → `setFgnOriginChallengeId(...)` → insert writes `fgn_origin_challenge_id`. Documented only.

### A4. Default imported work orders to draft (one-line patch)

In `WorkOrderEditDialog.handleImportChallenge`, add `setIsActive(false)` alongside the other `setX(data.X)` calls so new imports save with `is_active=false`. XP Reward continues to inherit `points_reward` (your six values: 12, 13, 11, 15, 14, 16).

### A5. Phase A acceptance

- Type regen succeeds with `MSFS_2024` present.
- `/admin/work-orders` → Import from FGN renders MSFS 2024 challenges.
- Importing one of the six produces a draft work order with `fgn_origin_challenge_id` set and `is_active=false`.

**Stop point:** I report back when Phase A is merged. You run the six imports via the admin UI, then send me the six `fgn_origin_challenge_id` values + the sim definition JSON for Phase B.

## Phase B — locked-in scope for after your imports (no work yet)

- **Stub course** `Microsoft Flight Simulator 2024 — Simulation Sync (Draft)` (`game_title='MSFS_2024'`, `is_published=false`), one module, **six stub lessons** (`lesson_type='simulation'`, `xp_reward=0`, `passing_score=70`), six `challenge_lesson_mappings` rows (`is_active=true`).
- **Simulation schema** (no `required` column). `simulation_items` columns: `id, simulation_id, display_order, name, sub, icon, cat, correct, critical, seq, why`. Comment on `critical`: *"Inclusion is the violation. A critical item picked (loadout) or critical step added anywhere in the flow (sequence) scores −25 and forces stand_down. Always correct=false."* `simulations.config` jsonb carries `critFailGrade`, `critFailLine`, and any per-sim band overrides.
- **RLS:** `simulation_items` base table denies SELECT to non-admins (`USING (false)`). Public reads via `simulation_items_public` view (security_invoker, simulation status='active') exposing only `id, simulation_id, display_order, name, sub, icon, cat`. `simulation_runs` insert via service role only; users read their own.
- **`run-simulation` edge function** mirrors `scoreRun()` / `gradeFor()` verbatim. Loadout: `+10` per correct picked, `−10` per non-correct non-critical picked, `−25` + stand_down per critical picked. Sequence: `+10` per correct step included AND in correct relative order among included correct steps, `−10` per correct step included out of relative order, `−10` per included non-correct non-critical step, `−25` + stand_down per critical step included. `max` per reference. `percent = max(0, round(raw/max*100))`, stand_down → 0. Grade via the four bands; stand_down → `critFailGrade` + `critFailLine` from `simulations.config`. Then call `sync-challenge-completion` with `{ user_email, challenge_id: fgn_origin_challenge_id, score: percent }`. Response: `{ attempt, record, debrief }`.
- **Player UI** at `/learn/:courseId/lesson/:lessonId/sim/:simulationId`. `LessonDetail` branches on `lesson_type='simulation'`: 1 sim → autoredirect, 2 sims (Cross-Country) → chooser, 0 sims (Working Pilot) → "Coming soon". `LoadoutBoard`, `SequenceBoard` (prerequisite-based relative-order grading among included correct steps; harmless insertions don't cascade), `DebriefPanel`. Pre-submit payload contains zero answer-key fields (enforced by the view, not by frontend discipline).
- **Track membership** — `challenge_track` `track_key='msfs-2024'` (create if missing), six `challenge_track_membership` rows.
- **Acceptance checks** (run after seeding, with cleanup + count confirmation):
  1. Clean sequence pass → lesson `completed`, XP once, credential written, `simulation_runs` row has `user_id`.
  2. Rerun worse → best-attempt semantics; nothing downgrades.
  3. Critical step included → `stand_down=true, percent=0`, sync receives 0, no credential, no lesson progress write.
  4. Anon + authenticated `select correct,critical,why,seq from simulation_items` both fail; `simulation_items_public` returns display columns only.
  5. Network tab on the Player before Submit contains no answer-key fields in any payload.

Proceeding to Phase A on approval to build.
