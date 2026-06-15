# Step 5 E2E Smoke Test — Option B (Disposable User)

**Gate:** Hold until user confirms roof challenge `d00bdfd0-6702-4e46-9ee8-6202aecf9005` is `is_active=true` on play.fgn.gg. Re-verify all 6 HF challenge UUIDs return from anon `FGN_PLAY_SUPABASE_URL/rest/v1/challenges` before proceeding.

**Precedent:** This becomes the standard pattern for all future smoke tests. No real-user pollution, ever.

## Execution

### 1. Create disposable user
- Service-role `auth.admin.createUser({ email: 'smoketest-hf-<ts>@fgn.internal', email_confirm: true, password: <random> })`.
- Capture `user_id`. Record start timestamp for leftover-scan window.
- Pre-snapshot row counts on every table this test can touch, keyed by `user_id` (always 0) and globally for aviation tables (must be unchanged at end).

### 2. SEQUENCE clean pass — WO-3010 (Gut the Room)
- Mint a JWT for the disposable user (service-role `auth.admin.generateLink` or sign in with password).
- POST `/functions/v1/score-simulation` with the correct seq order for sim-hf-3010's items. Pass-bar ≥70.
- Expect response: `stand_down=false`, `percent≥70`, no `critFailGrade`.
- POST `/functions/v1/sync-challenge-completion` with `challenge_id = hf-3010 UUID`, `score = percent`.
- Assert:
  - `simulation_runs` row exists, `passed=true`.
  - `user_work_order_completions`: exactly **1** row for (user, WO-3010), `status=completed`.
  - `user_points`: exactly **1** XP grant for `source_id=WO-3010` (no double-award).
  - `user_lesson_progress`: WO-3010 lesson `status=completed`.
  - `user_notifications`: a `knowledge_check_available` (or equivalent) entry routes to the HF lesson, not aviation.
  - `skill_credentials`: **0** new rows for this user. ← critical proof guard holds.

### 3. LOADOUT clean pass — WO-3120 (Roof, clean)
- Same flow with a fully correct loadout pick (no critical trap).
- Same assertions as Step 2, scoped to WO-3120.

### 4. CRITICAL pick — WO-3120 (skip fall protection)
- POST `/score-simulation` with the loadout that includes the `critical=true` skip-fall-protection item.
- Expect: `stand_down=true`, `percent=0`, `critFailGrade` line in response.
- POST `/sync-challenge-completion` with `score=0`.
- Assert:
  - `simulation_runs` row, `passed=false`, crit-fail recorded.
  - `user_work_order_completions`: row is `status=failed` (or no completed row) — **not** marked completed.
  - `user_lesson_progress`: WO-3120 lesson **not** `completed`.
  - `user_points`: no XP grant for this attempt.
  - `skill_credentials`: still 0.

### 5. Hard-delete + cascade verify
- `auth.admin.deleteUser(user_id)`.
- Run leftover scan across: `simulation_runs`, `user_work_order_completions`, `user_lesson_progress`, `user_points`, `user_notifications`, `telemetry_sessions`, `user_game_stats`, `skill_passport`, `skill_credentials`, `breakroom_sync_attempts`, `play_sync_attempts` filtered to (a) the disposable `user_id`, and (b) the test email.
- Required result: **0** rows in every table.
- If any table lacks `ON DELETE CASCADE` from `auth.users`, manually DELETE leftovers and flag the missing cascade in the report (do not fix it in this step — separate ticket).

### 6. Aviation untouched check
- Re-count: aviation course lesson count = 7, aviation sims = 7, no new `skill_credentials` for any real user during the test window, no new mappings.

## Acceptance Report

- Roof activation re-check: all 6 HF challenges visible to anon. ✓
- Step 2 (WO-3010 sequence): response body, DB assertions, **0 credentials**. 
- Step 3 (WO-3120 loadout clean): same.
- Step 4 (WO-3120 critical): stand_down/percent/critFailGrade body, DB assertions, **lesson not completed**.
- Step 5 leftover counts per table: all 0.
- Aviation deltas: all 0.
- Disposable user email + UUID, then confirmed deleted.

## Guardrails

- All edge-function calls authenticate as the disposable user, **never** as the preview-logged-in super_admin. Authorization header explicitly set on every `supabase--curl_edge_functions` call.
- No writes to real users' progress, points, notifications, or credentials at any point.
- If any assertion fails mid-run, stop, delete the disposable user, and report state — do not retry on a real account.

Hold for: (a) user confirmation that roof is active on play, (b) approval to enter build mode.