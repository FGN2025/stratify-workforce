
# v0.2 contract — Lovable side — **STATUS: LOCKED (2026-05-08)**

Toolkit confirmed all 6 gap answers: G1 UPDATE-in-place regen (toolkit owns DELETE of `scorm_course_work_orders` + `scorm_course_progress` in single service-role txn, no Lovable trigger needed); G2 `workOrderUrls[]` mirrors `workOrderIds[]` with `leadWorkOrderUrl` pinned; G3 path conventions confirmed (top-level for size/mixed, `[idx]` for per-WO; canonical code `BUNDLE_CHALLENGE_UNPUBLISHED`); G4 skills UNION sourced from `work_orders.skills_required`; G5 multi-bundle render order is Lovable's commit (lead first, then non-lead by `published_at desc`); G6 progress reset confirmed via toolkit's regen DELETE.

## v0.2 contract review — Lovable side

Reviewed against current schema (`scorm_courses` ships with the auto-named `scorm_courses_work_order_id_destination_key` constraint — your DROP statement matches), v0.1 override plumbing, v0.3 credential rollup, and the Course Builder UI shipped today.

## 1. Resolved-questions (proposed) — line-level verdicts

| # | Verdict | Notes |
|---|---|---|
| 1 Lead WO = `workOrderIds[0]` | **CONFIRM** | Matches our denormalized `scorm_courses.work_order_id = lead`. No separate field. |
| 2 Bundle size 2–10 | **CONFIRM** | Matches Course Builder picker constraints we'll wire. |
| 4 Mixed-framework soft warn | **CONFIRM** | We surface `MULTI_FRAMEWORK_BUNDLE` in the existing warnings panel; non-blocking. |
| 6 Card on every bundled WO + badge | **CONFIRM** | We'll add `useScormCoursesBundling` and render an outline `Badge` "Part of N-WO bundle" on the existing `LearningResourcesCard` row. Also adds a small "Lead" pill on the lead WO's card for parity with the admin existing-course panel. |
| 7 Extend single-WO flow with "+ Add another WO" | **CONFIRM** | No separate bundle-mode entry point. The picker becomes a sortable list; first row is auto-tagged Lead. |
| 9 Replacement keyed on lead WO change | **CONFIRM** | Matches `scorm_courses_lead_work_order_destination_unique`. Confirmation modal copy will read: *"This will replace the bundled course at this lead Work Order + destination, including its N bundled members. All learner progress for this course will be reset."* |

## 2. Open questions — decisions

**#3 XP rollup → Position A (SUM across WOs).** Drives our `scorm-session-complete` rollup. Reasoning: matches user-perceived effort and is consistent with how `user_lesson_progress` already grants per-lesson XP through the `module_milestone` and `course_completion` triggers (which sum, not pick-one). A 5-WO bundle that paid out only the lead's XP would visibly under-credit against per-lesson totals already in `user_points`, creating a reconciliation bug. Implementation: rollup query JOINs `scorm_course_work_orders → work_orders → lessons` and `SUM(COALESCE(l.xp_reward, wo.xp_reward, 100))` per bundled WO.

**#5 Knowledge-gate w/ mixed frameworks → highest-bar-wins.** Auto, no admin opt-in. Matches the #10 MAX-threshold rule for symmetry; admins who want to weaken can drop the strict-framework WO from the bundle. Avoids a foot-gun where opt-in defaults silently to the looser gate.

**#10 `passing_threshold` → MAX-of-quiz-thresholds (server-derived).** No admin override field in v0.2. Keeps the Course Builder form lean and avoids divergence between displayed and enforced thresholds. Re-evaluate in v0.4 when in-place lesson editing lands; if admins ask for override then, we add one course-level field with "auto" as the default.

## 3. Migration #2 — CONFIRMED, Lovable lands first

We'll author the migration exactly as drafted, with two small additions:

- Add `comment on table public.scorm_course_work_orders is 'v0.2 bundle membership; lead row mirrors scorm_courses.work_order_id'` for future maintainers.
- Add `comment on column public.scorm_course_work_orders.is_lead is 'Exactly one true per course_id; mirrors scorm_courses.work_order_id'`.
- Backfill is the single-transaction `INSERT ... SELECT id, work_order_id, 0, true FROM scorm_courses` you described — included in the same migration file so it can't drift.
- The DROP targets the auto-generated constraint name `scorm_courses_work_order_id_destination_key` — verified against the original 20260504 migration.

Migration will land before toolkit needs to curl-test persistence. Toolkit can stub against fixtures in parallel.

## 4. Flags / gaps

**a. `scorm_course_progress` keying — confirm unchanged.** Draft says "Keyed `(user_id, course_id)`, one row per learner per bundled course." We agree, but flag: the existing `useFgnAcademyProgress` hook resolves "current module" by walking `manifest.modules` in order. With bundled courses, a learner who completed challenge-2 modules independently in a previous single-WO course will NOT have their progress carried into the bundled course (different `course_id`). This is correct (per v0 hard-reset semantics) but worth surfacing in the smoke matrix as an explicit row so a tester doesn't file it as a bug.

**b. Non-lead WO in multiple bundles — query path.** Draft allows a non-lead WO to appear in N bundles. `LearningResourcesCard` could then show 3+ cards on a single WO page. Recommend the contract pin a soft cap or sort-order (e.g., "lead bundles first, then non-lead bundles by `published_at desc`") so the WO detail page doesn't degrade visually. Toolkit doesn't need to do anything — purely a Lovable UI rendering decision — but worth declaring in the contract so smoke tests know what to expect.

**c. `scorm-session-complete` skills UNION — source-of-truth question.** Skills currently come from `work_orders.skills_required` via the `handle_course_completion_credential` trigger. For bundled courses written through `scorm-session-complete` (not through enrollment), we'll use the same source — UNION across bundled WOs' `skills_required`. Flagging because the draft says "skills tagged on every bundled WO's lessons" but lessons don't carry skills directly in our schema; they roll up from the WO. Same outcome, just clearer attribution.

**d. Replacement bundle and orphan join rows.** When `isReplacement: true` fires (lead WO + destination collision), we'll `DELETE FROM scorm_course_work_orders WHERE course_id = <existing>` before re-inserting the new bundle membership. ON DELETE CASCADE on `course_id` handles the case where the toolkit replaces by deleting + re-inserting the `scorm_courses` row, but if replacement is in-place (same course_id, new bundle list), Lovable's edge fn or trigger needs to clear stale rows. Please confirm which path toolkit takes — we'll wire the cleanup to match.

**e. `workOrderUrls[]` ordering.** Confirm it mirrors `workOrderIds[]` ordering (lead first). Course Builder success state will render them as a numbered list with the lead pinned.

**f. Validation 400 surfacing — UI mapping.** We'll extend `ValidationSummary` to map the 7 new `BUNDLE_*` codes to the picker rows. The path conventions you proposed (`workOrderIds[<idx>]`) work with our existing JSONPath-ish parser regex `/(\w[\w-]*)|\[(\d+)\]/g`. Confirm `BUNDLE_MIXED_INPUT` and `BUNDLE_TOO_SMALL` / `BUNDLE_TOO_LARGE` use a top-level `path: "workOrderIds"` (no index) so the summary highlights the picker as a whole.

## Implementation sequence (Lovable side, post-LOCK)

1. Migration #2 (join table + RLS + backfill) — **blocking**, lands first.
2. `useScormCoursesBundling` hook + `LearningResourcesCard` badge variant — independent, can land before edge fn changes.
3. Course Builder multi-WO picker (sortable, lead-tagged) + bundle preview pane + recommended-title hint — depends on Migration #2 only for type generation, not on toolkit edge fn.
4. `scorm-session-complete` rollup query update (XP SUM + skills UNION through `scorm_course_work_orders`).
5. `ValidationSummary` mapping for `BUNDLE_*` codes.
6. Confirmation modal copy update for bundle replacement.
7. Cross-test against toolkit's curl-green edge fn.

Estimate: 2 days for migration + UI + rollup, plus cross-test. Parallelizable with toolkit's BuildRequest work after step 1 lands.

## Ready to LOCK

Once you fold in the three Open Question decisions (SUM / highest-bar / MAX-derived) and acknowledge the four flags above (especially **d — replacement cleanup path**), we're good to flip status to LOCKED and start Migration #2.
