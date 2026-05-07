## Diagnosis

You're correct — `scorm-session-complete` does not exist in this project. `supabase/functions/` contains only `scorm-build`, `scorm-launch-status`, `scorm-publish`. The hook ships, the migration shipped (table `scorm_course_progress` exists with the v0.3 columns: `total_time_seconds`, `last_session_id`, `score_raw`, `suspend_data`, `lesson_status`, `lesson_location`, `attempts`), but the function code was never authored on the Lovable side. The 404 preflight identical to a bogus name is exactly that: no function directory → no deployment → no route.

"Auto-deploy on push" only deploys functions whose source is present in the repo. Nothing failed silently; the source was never written.

## Plan

Create `supabase/functions/scorm-session-complete/index.ts` against the locked v0.3 contract, deploy it, run a curl matrix, then hand back for your smoke run.

### 1. Function: `supabase/functions/scorm-session-complete/index.ts`

- CORS preflight + standard headers (matches existing scorm-* functions).
- Auth: validate JWT via `supabase.auth.getUser()` using the caller's Authorization header; 401 if missing/invalid. `verify_jwt = false` at the platform level, validation in code (project convention).
- Zod-validated body matching the hook's `SessionCompletePayload`:
  - `course_id: uuid`
  - `session_id: uuid`
  - `lesson_status: enum('not attempted','incomplete','completed','passed','failed','browsed')`
  - `lesson_location: string nullable`
  - `score_raw: number nullable` (0–100)
  - `passing_threshold: number nullable` (0–100) — accepted but not persisted (not a column); used only to derive `passed` server-side as a sanity cross-check against the client's `passed`.
  - `session_time_seconds: number, integer, >= 0, <= 3600` — hard 400 outside envelope, no clamping (matches locked contract).
  - `scorm_suspend_data: string` (cap at e.g. 64KB to prevent abuse).
  - `passed: boolean`
  - `flush?: boolean` (informational; doesn't change server behavior).
- Verify `course_id` exists in `scorm_courses` and `is_published = true`; 404 if not.
- Upsert into `scorm_course_progress` on `(user_id, course_id)` with stateless time math:
  - `total_time_seconds = scorm_course_progress.total_time_seconds + EXCLUDED.session_time_seconds`
  - `suspend_data = EXCLUDED.suspend_data`
  - `lesson_status`, `lesson_location`, `score_raw` overwritten with new values
  - `last_session_id = EXCLUDED.session_id`, `last_session_at = now()`, `updated_at = now()`
  - On terminal status (`passed`/`failed`/`completed`), increment `attempts` on conflict; on first-pass insert, leave `attempts` at 0 unless terminal (then 1).
- On terminal `passed=true`:
  - Resolve `passport_id` via `ensure_skill_passport(user_id)` RPC (exists in db).
  - INSERT into `skill_credentials` with `source='scorm_session'`, `course_id`, `credential_type='course_completion'`, `title` = course title, `issuer='FGN Academy'`, `xp_earned` = course xp_reward (lookup from `scorm_courses`/source course; if scorm_courses lacks xp, default 0 with warn), `attempts=1`, `external_reference_id = 'scorm:'||course_id||':'||user_id`, `verification_hash` = sha256(passport||ref||now).
  - ON CONFLICT (passport_id, source, external_reference_id): `attempts = skill_credentials.attempts + 1`, `xp_earned = GREATEST(skill_credentials.xp_earned, EXCLUDED.xp_earned)`, `issued_at = now()`. Requires a unique index — verify and add via migration if missing.
  - `user_points` first-pass grant: insert XP row only when `attempts = 1` (i.e., the INSERT path, not the conflict path). Use a returning clause from the credential upsert to detect first-pass.
- Response: `{ status:'ok', total_time_seconds, attempts, credential_issued: boolean }`.
- All errors include CORS headers; structured logging (`console.log` with JSON) for edge tail.

### 2. Migration (only if needed)

Verify the unique constraints exist:
- `scorm_course_progress (user_id, course_id)` — required for upsert.
- `skill_credentials (passport_id, source, external_reference_id)` where `source='scorm_session'` — required for the re-pass conflict path.

If either is missing, ship a migration that adds them. (Will check via supabase--read_query during build before authoring.)

### 3. Deploy + curl matrix

- `supabase--deploy_edge_functions(["scorm-session-complete"])`.
- Confirm boot via `supabase--edge_function_logs`.
- Curl matrix against a real published `course_id`:
  1. Fresh in-progress flush (lesson_status=incomplete, time=30) → 200, row inserted, total=30.
  2. Second flush (time=45) → 200, total=75, no credential.
  3. Terminal pass (passed=true, score=85) → 200, credential row, user_points +xp, attempts=1.
  4. Re-pass (passed=true, score=92) → 200, attempts=2, GREATEST xp held, no second user_points row.
  5. Negative envelope: time=-5 → 400. time=4000 → 400. Bad body shape → 400. Missing auth → 401. Unknown course → 404.

### 4. Hand back

Ping you with: deployed function id, curl matrix output, and confirmation the 5 negative cells return the expected status codes. You re-run your smoke matrix against the live function; I tail edge logs in parallel.

## Out of scope

- No changes to the hook (`useFgnAcademyProgress.ts`), `ScormPlayer.tsx`, or `ScormPlayerLaunch.tsx` — the client side is correct as shipped at c4acd0e.
- No changes to `scorm-build` or the enhancer.
- No backfill endpoint for >1h sessions (out-of-band per locked contract).

## Risk

Low. Function is additive, gated on auth, validates strictly, and the client gracefully degrades on any non-2xx (already proven by the 404 you observed). Worst case the curl matrix surfaces a contract drift I fix before handing back.
