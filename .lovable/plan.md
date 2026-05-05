
## Scope

Four parallel deliverables coordinating with `fgn-scorm-toolkit` Phase 2 v0:

1. **Secrets** — Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` to scorm-build function (unblocks toolkit Steps 5/6).
2. **Migration #1** — Skill Passport enrichment schema (v0.3 lock-in).
3. **Step 7** — Native SCORM Player route at `/scorm-player/:courseId/launch`.
4. **Step 8** — Course Builder admin page at `/admin/course-builder`.

---

## 1. Secrets

Use `add_secret` for `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`. Both consumed by `scorm-build/_lib/course-enhancer/*`. No code changes.

---

## 2. Migration #1 — Skill Passport Enrichment Schema

Single migration, additive only, nullable columns to keep `sync-challenge-completion` and `credential-api` working.

**`skill_credentials` — new columns:**
- `source text` — `'work_order' | 'scorm_session' | 'external_api' | 'manual'`
- `course_id uuid` — nullable FK-style reference to `scorm_courses.id`
- `lesson_id uuid` — nullable
- `module_id uuid` — nullable
- `xp_earned integer default 0`

**Partial unique index (idempotency for SCORM retakes):**
```
CREATE UNIQUE INDEX skill_credentials_scorm_session_unique
  ON skill_credentials (passport_id, course_id)
  WHERE source = 'scorm_session';
```

**New table `scorm_course_progress`** (transient session state, read by player on launch):
- `id uuid PK`, `user_id uuid`, `course_id uuid`, `lesson_id uuid nullable`
- `suspend_data text` (SCORM CMI suspend_data)
- `lesson_status text`, `lesson_location text` (bookmark)
- `score numeric`, `attempts integer default 0`
- `last_session_at timestamptz`, `created_at`, `updated_at`
- Unique `(user_id, course_id)`
- RLS: users read/write own rows; admins read all; service role bypass for `scorm-session-complete` (deferred).

**Triggers (`SECURITY DEFINER`, `SET search_path = public`):**
- `trg_course_completion_credential` — on `user_course_enrollments.completed_at` set, INSERT a `course_completion` credential rolled up from lesson skills + course xp.
- `trg_module_milestone` — on completion of all lessons in a module, INSERT a `badge` credential (skipped if module has no `skills_granted` metadata).
- Both call a shared `ensure_skill_passport(user_id)` helper.

**Backfill (idempotent DO block in same migration):**
- For every historical `user_course_enrollments.completed_at IS NOT NULL` without a matching `course_completion` credential, insert one.
- For every completed module per user without matching badge, insert one.
- Guarded by `NOT EXISTS` checks against `external_reference_id = enrollment.id::text`.

**`verification_hash`** computed in trigger as `encode(digest(passport_id::text || coalesce(external_reference_id,'') || issued_at::text, 'sha256'), 'hex')`.

---

## 3. Step 7 — SCORM Player Route

**Route:** `/scorm-player/:courseId/launch` added to `App.tsx`. Auth-gated via `ProtectedRoute`.

**New page:** `src/pages/ScormPlayerLaunch.tsx`
- Fetches `scorm_courses` row by `courseId` (RLS handles published gating).
- Vendored player lives at `src/lib/scorm-player/` — copy `packages/scorm-player` from the toolkit. Treat as a leaf module; no deps beyond what's already in `package.json`.
- Renders the player in an iframe-safe wrapper sized to viewport minus topnav.
- Shows preview banner (warning style, top of player frame): **"Preview mode — progress sync ships in v0.3."**
- Wires `reportProgress(state)` as a `useCallback` no-op that `console.debug`s the payload shape. Marked `// v0.3: POST to scorm-session-complete` so the stub is obvious during the v0.3 swap.
- Loads launch URL from `scorm_courses.manifest_url` (or `zip_url` extracted index — confirm with toolkit's player API on copy).

**Vendoring:**
- Copy player source under `src/lib/scorm-player/` with a top-of-file `// Vendored from fgn-scorm-toolkit packages/scorm-player @ <commit>` header.
- No build pipeline changes; player is plain TS/React.

---

## 4. Step 8 — Course Builder Admin Page

**Route:** `/admin/course-builder` (wrapped in `AdminRoute`).

**New page:** `src/pages/admin/CourseBuilder.tsx`

**UI flow (industrial command center aesthetic):**
1. **Challenge selector** — multi-select autocomplete sourced from `fetch-challenges` edge function (existing). Shows challenge name + framework chip. Drag-to-reorder.
2. **Bundle config card** — title (editable, prefilled from derived title), description (editable), pillar override (Select), destination (`fgn-academy` | `external-lms`), SCORM version (`1.2` | `cmi5`).
3. **AI enhancement toggles** — checkboxes for: regenerate description, regenerate cover image, generate quiz placeholders. Disabled with tooltip "Awaiting toolkit Steps 5/6" until those ship; surface as pass-through flags now so the contract is locked.
4. **Build action** — calls `scorm-build` edge function via `supabase.functions.invoke`. Streams warnings into a results panel (level chip, code, message, suggestion).
5. **Result card** — on success show `bundle_id`, manifest URL, ZIP URL, "Open in Player" link to `/scorm-player/:courseId/launch` once a `scorm_courses` row exists.

**New hook:** `src/hooks/useScormBuild.ts` — wraps the edge function call, returns `{ build, isBuilding, result, warnings, error }`.

**Sidebar:** Add "Course Builder" entry under admin section in `AppSidebar.tsx`.

---

## Sequencing

```text
[1] Add secrets ─────────► toolkit Steps 5/6 unblocked
[2] Migration #1 ────────► v0.3 schema locked
[3] Step 7 player ──┐
                    ├──► v0 testable end-to-end (no progress sync)
[4] Step 8 builder ─┘
```

Items 1–4 ship in this loop. Item 4 from the prior plan (`scorm-session-complete` edge function) remains deferred until toolkit Step 7 ships.

## Out of scope this loop

- Backfill items 5–8 from prior plan (achievement engine, UI surfacing on Profile/Passport, verification harness) — call out as next loop after Player + Builder land so they can be tested against real generated courses.
- `scorm-session-complete` edge function — deferred per contract.

## Files touched

- `supabase/migrations/<ts>_skill_passport_enrichment.sql` (new)
- `src/App.tsx` (routes)
- `src/pages/ScormPlayerLaunch.tsx` (new)
- `src/pages/admin/CourseBuilder.tsx` (new)
- `src/hooks/useScormBuild.ts` (new)
- `src/lib/scorm-player/**` (vendored, new)
- `src/components/layout/AppSidebar.tsx` (sidebar entry)
