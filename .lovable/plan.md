## Goal

Register play.fgn.gg challenge `5af1f4bf-ef20-4f34-a232-90a841a0842e` (studio sim `sim-harvest-2690`, WO-2690 "Harvest Day Prep — Hartley Place Corn") for completion sync so passing runs write XP and skill credentials to fgn.academy player records — without surfacing placeholder lesson content to learners.

## State of play

- WO `7505ec5b-305e-484b-bc55-999cd4c3d468` already carries `fgn_origin_challenge_id = 5af1f4bf-…`. fgn.academy identity is locked in; no WO change.
- No lesson is attached, no `challenge_lesson_mappings` row exists. That is the gap.

## Score contract (confirmed)

play.fgn.gg sends a normalized `score` integer 0–100 in the `challenge.completed` webhook. `sync-challenge-completion` treats:

- `score ≥ 70` → pass → `user_lesson_progress.status = completed`, XP granted, downstream `skill_credentials` written.
- `score < 70` → stand-down → failed attempt logged in `play_sync_attempts`, no credential.

GREEN APPRENTICE band on the Play side maps to `score ≥ 70`. Stand-down maps to `score < 70`. No code change to the sync function.

## Changes (single migration)

1. **Draft course shell** in `courses`:
   - `title`: `Farming Sim — Simulation Sync (Draft)`
   - `game_title`: `Farming_Sim`
   - `is_published`: `false` (UI hides unpublished courses; this is the inactive gate)
   - `tenant_id`: null, `xp_reward`: 0, `difficulty_level`: 'beginner', `estimated_hours`: 0

2. **Module** under that course:
   - `title`: `Farming_Sim`, `order_index`: 0, `xp_reward`: 0

3. **Stub lesson** under that module:
   - `title`: `Harvest Day Prep — Loadout Gear Check`
   - `lesson_type`: `simulation`
   - `work_order_id`: `7505ec5b-305e-484b-bc55-999cd4c3d468`
   - `xp_reward`: 50, `passing_score`: 70, `order_index`: 0
   - `content`: `{"draft": true, "studio_sim_id": "sim-harvest-2690", "origin_challenge_id": "5af1f4bf-ef20-4f34-a232-90a841a0842e"}`

4. **Mapping row** in `challenge_lesson_mappings`:
   - `play_challenge_id`: `5af1f4bf-ef20-4f34-a232-90a841a0842e`
   - `lesson_id`: new lesson UUID
   - `is_active`: `true` (sync picks it up; learner visibility is gated by the unpublished course)
   - `notes`: `WO-2690 Harvest Day Prep / Hartley Place Corn — loadout gear check. Stub lesson; replace content before publishing.`

5. **No change** to `sync-challenge-completion` or the work order.

## Acceptance checks (post-merge)

1. **Pass run** — POST to `sync-challenge-completion` with `challenge_id=5af1f4bf-…`, test email, `score: 85`. Expect: `user_lesson_progress.status='completed'` for the new lesson, XP credited, `skill_credentials` row if the parent challenge is on a credential track.
2. **Stand-down run** — same POST with `score: 40`. Expect: failed attempt in `play_sync_attempts`, no credential, no completed lesson progress.
3. **Boundary run** — same POST with `score: 70` (lowest GREEN APPRENTICE). Expect: pass behavior identical to check 1 — confirms the `≥ 70` boundary is inclusive and the GREEN APPRENTICE floor credentials correctly.

## Deliverable back to you

After the migration runs I will reply with:
- `course_id` (draft shell)
- `module_id` (the "Farming_Sim" module code)
- `lesson_id` (record upstream as the fgn.academy code for `sim-harvest-2690`)
- `challenge_lesson_mappings.id`

## Technical notes

- Single migration: 1 course + 1 module + 1 lesson + 1 mapping. All four tables already have GRANTs and RLS from prior migrations.
- The lesson-lookup cache inside `sync-challenge-completion` has a 60 s TTL — first passing run may need to wait up to 60 s, or the function can be cold-started by redeploy.
- When fgn.academy curriculum delivers real content, replace the lesson's `content` JSON and flip the course `is_published` to true. The mapping and origin challenge ID stay stable.
