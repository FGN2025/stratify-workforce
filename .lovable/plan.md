
## Build scope: Phase G0 + G1 + G2 — Learning Sources framework + BBW pull adapter

Generalize the Play-specific receiver into a multi-source ingestion framework, ship a pull-mode adapter for Broadband Workforce (FiberTech Academy), and publish the inbound contract doc that future sources can build against. Play's 2026-05-25 cutover stays untouched.

---

### G0 — Source registry + receiver generalization

**New tables (migration)**
- `learning_sources(slug PK, display_name, hmac_secret_env_name, strict_mode bool, skill_tag_pattern text, ingestion_mode 'push'|'pull', icon_url, is_active, created_at)`. Seed `play` (push, env `PLAY_WEBHOOK_SECRET`) and `bbw` (pull, no secret yet).
- `external_content_mappings(id, source_slug FK, external_id, work_order_id FK, lesson_id FK nullable, is_active, unique(source_slug, external_id))`. Backfill from `challenge_lesson_mappings` for `source_slug='play'`.
- `learning_source_replay_queue` — same shape as `play_replay_queue` plus `source_slug`. Migrate existing rows with `source_slug='play'`. Keep `play_replay_queue` as a backwards-compat view for the duration of G1.

**New shared module** `supabase/functions/_shared/learning-source/`
- `resolveSource(req)` — reads `X-Learning-Source` header, falls back to `X-Ecosystem-App='play-webhook'` for compat, looks up registry row, returns config (secret env name, strict_mode, skill_tag_pattern, ingestion_mode).
- `verifySignature(source, rawBody, sigHeader)` — generalized HMAC check using per-source env var.
- `sanitizeSkillTags(source, tags)` — uses `source.skill_tag_pattern` instead of hard-coded regex.
- `handleAchievementEarned(source, payload, supabase)`, `handleEvidenceApproved(...)`, `resolveIdentity(...)`, `recordSyncAttempt(...)` — extracted from `play-webhook-receiver/index.ts` verbatim, parameterized by `source_slug`.

**New edge function** `learning-source-webhook/index.ts`
- Thin shim: resolveSource → verifySignature → dispatch to shared handler. ~80 lines.
- `play-webhook-receiver` keeps importing the same `_shared/learning-source/` handlers (no behavior change for Play traffic).

**Updated trigger functions**
- `enqueue_replay_on_signup` and `enqueue_replay_on_mapping` accept `source_slug` parameter, write to `learning_source_replay_queue`.
- `process-play-replay-queue` renamed internally to source-aware; cron job updated to drain all sources, not just Play.

---

### G1 — BBW pull adapter

**New edge function** `learning-source-pull-bbw/index.ts`
- Reads `BBW_SUPABASE_URL` + `BBW_SUPABASE_SERVICE_ROLE_KEY` from secrets.
- Reads cursor from new `learning_source_pull_cursor(source_slug PK, last_completed_at, last_external_id, updated_at)`.
- Queries BBW: `SELECT e.id, e.user_id, e.completed_at, e.course_id, c.title, c.difficulty_level, p.display_name, au.email FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN profiles p ON p.user_id = e.user_id JOIN auth.users au ON au.id = e.user_id WHERE e.status='completed' AND e.completed_at > cursor ORDER BY e.completed_at ASC LIMIT 100`.
- For each row, builds canonical `achievement.earned` payload:
  - `external_user_id = enrollment.user_id` (BBW UUID)
  - `email = au.email`
  - `achievement_id = bbw:enrollment:${enrollment.id}` (idempotency key)
  - `title = course.title`
  - `evidence_url = https://broadbandworkforce.com/verify?id=${enrollment.id}`
  - `skills_verified` — derived from existing `external_content_mappings` lookup for `(bbw, course_id)`; falls back to empty array if unmapped (which routes the attempt to `unmapped_challenge` and the admin queue).
- Calls `handleAchievementEarned` directly (in-process, no HTTP round trip). Updates cursor only after successful batch commit.
- New `learning_source_pull_attempts` log table (mirrors `play_sync_attempts` shape with `source_slug` column). Compatibility view `play_sync_attempts` keeps the existing admin UI alive.

**Cron**
- New `pg_cron` job: every 5 min, `net.http_post` to `learning-source-pull-bbw`.
- Existing 2-min replay-queue cron stays, now drains all sources.

**Identity hardening**
- After a successful BBW match, insert into new `learning_source_identity(source_slug, external_user_id, user_id, matched_via 'email'|'manual', created_at)`. Subsequent attempts match by `external_user_id` first (avoids email-change drift and saves a roundtrip).

---

### G2 — Inbound contract doc + BBW push-stub

**New doc** `docs/api/integration-guides/inbound-learning-source.md` covering:
- Endpoint: `POST /functions/v1/learning-source-webhook`
- Required headers: `X-Learning-Source: <slug>`, `X-Learning-Source-Signature: <hmac-sha256-hex>`, `Content-Type: application/json`
- Event taxonomy: `achievement.earned`, `evidence.approved`, `challenge.completed` (optional), `enrollment.completed` (optional)
- Canonical payload schema (JSON, with examples)
- Skill-tag namespace registration process (write to `learning_sources.skill_tag_pattern`)
- Idempotency contract (per `achievement_id`)
- Replay semantics (`unmapped_identity` and `unmapped_challenge` resolve automatically when admin or user fills in the missing link)
- Strict-mode flip process (shadow → strict, same playbook as Phase E)
- Onboarding checklist for new partners

**Registry seed update**: `bbw` row stays `ingestion_mode='pull'` until BBW ships a dispatcher; flipping to `push` is a single-row UPDATE then the same function services it. No code change.

---

## Technical details

**No Play regression risk.** `play-webhook-receiver` keeps its URL, secret, and behavior — it just delegates to the shared handlers. Existing Play attempts, replay queue, mappings, and admin UI continue working through compat views. Tested by replaying existing fixtures end-to-end against the shared module before deploying.

**Why pull for BBW.** BBW has no outbound dispatcher today. Pull-mode uses BBW credentials already in secrets and unblocks integration immediately. When BBW ships a dispatcher, flip `ingestion_mode` to `push` and disable the cron — same code path.

**One credential write path.** Pull adapter doesn't reimplement credential logic — it synthesizes a canonical `achievement.earned` payload and calls the same `handleAchievementEarned` Play uses. One handler, two sources, zero divergence.

**Skill-tag governance.** Today's regex `^(fiber|osha|cdl|gaming|difficulty):...$` becomes per-source via `learning_sources.skill_tag_pattern`. BBW gets `^(fiber|osha|nicet|bicsi):[a-z0-9-]+$`. Adding a namespace = one UPDATE.

**Identity match order.** (1) `learning_source_identity` lookup by `(source_slug, external_user_id)`, (2) email lookup via existing `get_user_id_by_email` RPC, (3) fall through to `unmapped_identity` and enqueue replay. First successful email match seeds `learning_source_identity` so subsequent events skip step 2.

**Cursor semantics.** `learning_source_pull_cursor.last_completed_at` advances only after the batch commits. If the batch partially fails, the next run reprocesses the failed tail; idempotency on `achievement_id = bbw:enrollment:<uuid>` makes that safe.

**Verification chain.** BBW's existing `verify-certificate` public endpoint is the evidence URL. External verifiers (CDL Exchange et al.) hit Academy's existing public passport API; the embedded BBW link provides upstream proof. No new public endpoint.

**Secrets required (G1 only)**
- `BBW_SUPABASE_URL` (verify it's present; if not, `add_secret` before deploy)
- `BBW_SUPABASE_SERVICE_ROLE_KEY` (same)

If either is missing, the build pauses to request via `add_secret`.

**Out of scope for this build (defer to G3/G4 post-cutover)**
- `/admin/learning-sources` registry CRUD page
- Skill Passport `<LearningSourceCredentialsSection>` source bands
- `external_scorm_courses` catalog passthrough into `LearningResourcesCard`
- Refactoring `ParityMonitorDashboard` to source-tabbed view
- Renaming `play_*` tables to generic `learning_source_*` (compat views handle this for now)

---

## Deliverables

**Database (1 migration)**
- 4 new tables, 1 backfill, 2 compat views, 2 trigger updates, 1 new cron job

**Edge functions**
- New: `_shared/learning-source/` (5 files), `learning-source-webhook/index.ts`, `learning-source-pull-bbw/index.ts`
- Updated: `play-webhook-receiver/index.ts` (delegates to shared), `process-play-replay-queue/index.ts` (source-aware drain), `sync-challenge-completion/index.ts` (uses shared sanitizer)

**Docs**
- `docs/api/integration-guides/inbound-learning-source.md` (new)
- `docs/play-to-academy-hmac-contract-ping.md` (add cross-reference to new doc)

**Verification**
- Replay 3 historical Play fixtures through new shared handler — compare credential output to current production rows
- Curl `learning-source-webhook` with `X-Learning-Source: play` and a signed test payload — confirm identical credential write
- Manual cron trigger of `learning-source-pull-bbw` against a BBW staging row — confirm credential lands, identity seeded, mapping queue surfaces unmapped courses
- `supabase--read_query` on `learning_source_replay_queue` to confirm trigger backfill catches BBW `unmapped_identity` on signup
