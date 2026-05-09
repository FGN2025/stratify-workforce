# Atlas Persona Persistence — Assessment & Gaps

## Persistence layer (DB) — HEALTHY

`ai_persona_configs` has 11 active rows resolved by `ai-tutor` in this order: `game_<title>` → `context_type` → hardcoded fallback. Coverage:

| context_type            | persona                       | prompt_len | notebook_url | model_override |
|-------------------------|-------------------------------|-----------:|--------------|----------------|
| general                 | Atlas - General               | 640        | —            | —              |
| research                | Atlas - Research              | 485        | —            | —              |
| onboarding              | Atlas - Onboarding            | 398        | —            | —              |
| course                  | Atlas - Course                | 410        | —            | —              |
| work_order              | Atlas - Work Order            | 364        | —            | —              |
| game_ATS                | Atlas - CDL Training          | 608        | —            | —              |
| game_Fiber_Tech         | Atlas - Fiber Tech            | 545        | —            | —              |
| game_Construction_Sim   | Atlas — Construction Sim Tutor| 690        | —            | —              |
| game_Farming_Sim        | Atlas — Farming Sim Tutor     | 656        | —            | —              |
| game_Mechanic_Sim       | Atlas — Mechanic Sim Tutor    | 667        | —            | —              |
| game_Roadcraft          | Atlas - Roadcraft             | 1033       | —            | —              |

Every `game_title` enum value has a matching persona row. Persona edits persist via `useUpdateAIPersona` and survive sessions.

## Gaps

### 1. SIM Industry Hub does not activate the SIM persona (HIGH)
`/sim/:gameTitle` (e.g. the current `/sim/Mechanic_Sim`) never calls `setCurrentGameTitle`, and `useTutorContext` has no `/sim/...` branch — Atlas falls through to the generic `general` persona instead of `game_Mechanic_Sim`. Most visible miss given Roadcraft + Mechanic_Sim were just activated.

### 2. Course / Lesson pages don't pass `gameTitle` (HIGH)
- `/learn/courses/:id` resolves to `type: 'course'` with no `gameTitle`, even though `courses.game_title` is now populated for Roadcraft Foundations and CMS Foundations.
- `/lessons/:id` isn't routed at all in `useTutorContext` — falls into default `general`. The `lesson` value exists in `TutorContextType` but is never produced.

Result today: SIM-flavored personas only fire on work-order detail pages.

### 3. `setCurrentGameTitle` is a module-level singleton (MEDIUM)
Cross-tab / fast-nav races can leave a stale game title if a component unmounts after another mounts. Migrate to React context colocated with `TutorProvider`.

### 4. Open Notebook readiness — wiring exists, plumbing is uneven (MEDIUM, **expanded per user direction**)

Open Notebook is already plumbed end-to-end:
- `ai-tutor` reads `notebook_url` per persona, queries `OPEN_NOTEBOOK_API_URL/ask` with `OPEN_NOTEBOOK_API_PASSWORD`, and grafts the answer + citations into the system prompt.
- `TutorChatPanel` shows a "Open Notebook" book icon when either a SIM persona has `notebook_url` or `ai_platform_settings.open_notebook_url` is set globally.

But: **all 11 rows have `notebook_url = NULL`**, the column is misnamed (`notebook_url` actually stores a notebook **id** that is appended to `/ask` as `notebook_id`), and there's no admin path or convention for filling it. Since the user has stated every Atlas instance will eventually get its own notebook, this build phase needs to:

- **a.** Reserve a `notebook_url` (id) slot on every persona row — confirm column is nullable (it is) and add a comment clarifying it stores a notebook id, not a URL. Optionally rename to `notebook_id` in a follow-up migration to avoid confusion; for now keep the name to avoid touching the edge function.
- **b.** Make the resolver tolerant of partial rollout: today a missing `notebook_url` simply skips RAG, which is correct — verify no UI copy ("curated knowledge base is available") fires unless an id is present. The current `buildSystemPrompt` does gate on `notebookId`, good.
- **c.** Expose `notebook_url` as a first-class field in the persona admin UI so notebooks can be attached one-by-one as they're authored, without code changes per persona. (Confirm `useUpdateAIPersona` already accepts arbitrary `Partial<AIPersonaConfig>` — it does.)
- **d.** Add a per-persona "Test notebook" action in admin that pings `/ask` with a canned question and surfaces latency + citation count, so authors can validate connectivity before users hit it.
- **e.** Document the precedence: per-persona `notebook_url` overrides `ai_platform_settings.open_notebook_url` (the panel already reflects this; record it in the Atlas memory).
- **f.** Confirm both `OPEN_NOTEBOOK_API_URL` and `OPEN_NOTEBOOK_API_PASSWORD` secrets are configured in Lovable Cloud for **Test** and **Live** before rollout — RAG silently no-ops if either is missing.
- **g.** Telemetry: add a lightweight log line in `ai-tutor` when a notebook query is attempted vs. skipped vs. failed, so we can measure notebook hit-rate per persona once they start landing.

### 5. No persona for `game` context type (LOW)
`TutorContextType` lists `game` but no row emits it. Either drop it from the union or emit it from `/sim/:gameTitle` (preferred — pairs with fix #1).

### 6. No audit / version history (LOW)
`ai_persona_configs` has `updated_at` but no `updated_by` or version trail. A bad edit silently overwrites the live persona for every user. Add a lightweight `ai_persona_config_history` table before notebooks start landing — bad notebook ids should be one-click revertable.

### 7. Admin surface (LOW — verify)
`useAIPersonas` exists but the audit didn't surface a sidebar entry. Confirm personas are editable in-app (required to make #4c useful) vs. SQL-only today.

## Recommended fix order

1. **Wire `/sim/:gameTitle` into `useTutorContext`** — emit `{ type: 'game', gameTitle }` so the `game_*` persona resolves on the hub.
2. **Propagate `gameTitle` from courses/lessons** — read `courses.game_title` in `CourseDetail`/`LessonDetail`, call `setCurrentGameTitle` on mount; add `/lessons/:id` and `/learn/courses/:id` branches.
3. **Notebook readiness pass (#4 a–g)** — admin field, test ping, secret check, telemetry, memory note. No notebook ids seeded yet; just make sure attaching one is a 30-second admin action.
4. **Harden the singleton** — move `_currentGameTitle` into a React context provider colocated with `TutorProvider`.
5. **Add a versioning table + admin diff view** before opening persona edits to non-super-admins.

## Out of scope for this audit
- Authoring notebook content itself.
- Rewriting persona prompts.
- Migrating personas from DB to file-based seeds.
