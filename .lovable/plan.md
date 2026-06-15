# SCORM packages are missing the challenge body

## What's happening

Open Preview shows only the **post-completion briefing** and (for some frameworks) a knowledge-check quiz — never the challenge's own description, objective, or task list. That isn't a UI bug; it's exactly what the builder emits today.

In `supabase/functions/scorm-build/_lib/scorm-builder/builder.ts`:

- Line 78: `const includeChallenge = options.includeChallengeModule ?? false;` — challenge modules are **off by default**.
- Lines 101–109: the only always-on per-challenge slot is a `briefing` (a recap written *after* you've already done the work).
- Lines 115–127: the `challenge` module (which carries `title`, `tasks[]`, `challengeUrl`, `game`, `credentialFramework`) is gated behind that flag and is never enabled by any caller.
- Comment at 111–114 explicitly states the rationale: "the challenge belongs to the Work Order layer on fgn.academy, not the SCORM/Learn layer."

For the **fgn.academy native destination** that comment is defensible — the WO page renders the challenge details and the briefing is just the recap. But the same builder also produces **SCORM ZIPs intended for external LMSes** (Brand Mode = Arcade, Destination switch present on screen 1). An external LMS has no link back to play.fgn.gg's WO layer, so the package as currently built omits:

- The challenge's own `description` (the "what you're doing and why")
- `certification_description` / framework context
- The full `tasks[]` list with each task's `title`, `description`, and the "Evidence: …" line that `mapTask()` already knows how to extract (builder.ts:214–245)
- A pre-launch / objective slot before the recap

Result: the SCORM package is not self-contained. A learner opening it in an external LMS sees a recap of work they were never told about.

There's a second, smaller issue layered on top: even when a `challenge` module exists in the manifest, the Course Builder Preview UI only iterates `briefing` and `quiz` modules (CourseBuilder.tsx:598–603, 674–688), so admins can't see or sanity-check the challenge body before publishing.

## Fix

Two changes, scoped to the SCORM build pipeline. No DB schema work. No changes to fgn.academy's native lesson model — those rows are written by `scorm-publish` and already carry tasks for `lesson_type='work_order'`.

### 1. Builder: emit a self-contained "objective" module per challenge, always

In `builder.ts` `buildCourseManifest`, before the existing `briefing` push, emit a new always-on module per challenge that carries the full challenge body. Reuse the existing `mapTask` and `inferFramework` helpers:

```ts
modules.push({
  id: `${moduleIdPrefix}-objective`,
  position: position++,
  type: 'challenge',
  title: challengeName,
  challengeId: fc.challenge.id,
  challengeUrl: `https://play.fgn.gg/challenges/${fc.challenge.id}`,
  ...(game !== undefined ? { game } : {}),
  ...(framework !== undefined ? { credentialFramework: framework } : {}),
  description: fc.challenge.description ?? '',
  certificationDescription: fc.challenge.certification_description ?? null,
  tasks: fc.tasks.map(mapTask),
  preLaunchHtml: buildPreLaunchHtml(fc, game, framework), // small helper analogous to buildBriefing
});
```

- Retire the `includeChallengeModule` flag (or default it to `true` for back-compat callers that pass it explicitly). The "challenge layer lives on fgn.academy" assumption no longer holds for the SCORM destination.
- Extend `CourseModule` of type `challenge` in `src/lib/scorm-player/types.ts` and the equivalent type in `supabase/functions/scorm-build/_lib/course-types.ts` to include `description` and `certificationDescription`. `tasks` and `preLaunchHtml` already exist (see `scorm-publish/index.ts:240–249` where the lesson insert reads them).
- `scorm-publish` already maps `type:'challenge'` → `lesson_type:'work_order'` with `tasks` and `preLaunchHtml` written into `lessons.content` (scorm-publish/index.ts buildLessonInsert). So once the builder emits the module, fgn.academy native lessons get the body automatically; SCORM ZIP HTML pages get them via the existing SCORM pack/templating path that already understands `type:'challenge'`.

### 2. Course Builder Preview: render and allow override of the challenge body

In `src/pages/admin/CourseBuilder.tsx`:

- Add a `challengeModules` memo alongside the existing `briefingModules` / `quizModules`.
- Render a new read-only-by-default `ChallengeModuleCard` (mirrors `BriefingModuleCard` shape) that shows: title, description, framework, and a numbered task list with each task's description + evidence spec.
- Phase 1: read-only display so admins can verify the body before publishing.
- Phase 2 (separate ticket, only if requested): per-task description overrides plumbed through `useScormBuild` like `briefingHtml` / `quizQuestions` already are.

### 3. Acceptance

- Re-run the MSFS Preflight Walkaround preview. Confirm a new "Objective" / challenge card appears above the Briefing card, listing each task and its evidence spec.
- Publish to `fgn.academy` (native). Confirm the work-order lesson row's `content` JSON now contains `description`, `tasks`, and `preLaunchHtml`.
- Publish to `Arcade` (SCORM ZIP). Open the generated ZIP and confirm the challenge HTML page renders the description + task list with no link-out required.
- Existing aviation/HF tracks: this is additive — no existing lessons are rewritten, and `is_published` state is untouched. New builds get the richer manifest; previously published courses are unaffected unless rebuilt.

## Out of scope

- Changes to native fgn.academy lesson rendering of `lesson_type='work_order'` (already reads `content.tasks` and `content.preLaunchHtml`).
- Changes to the credential issuance doctrine. This is purely a SCORM/manifest content fix.
- Per-task editing UX (Phase 2).
