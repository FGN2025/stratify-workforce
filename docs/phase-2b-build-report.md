# Phase 2B build report — House Flipper 2 reasoning + quantitative evidence prototype

Status: COMPLETE — stopped at the Phase 2B review gate. No catalog migration, no other prototypes.

## 1. Live canonical source (retrieved from the live FGN.GG ecosystem-data-api)

| element | value |
|---|---|
| Canonical Simulation Activity | `19720a68-04bd-4dae-8f74-17e91d14d4b5` — "Interior Surface Preparation and Painting" |
| Game | House Flipper 2 (game_version `2`) |
| activity_category / industry_domain | `finishing_work` / `residential_trades` |
| status / provenance | `active` / `derived_from_challenge` |
| GG Challenge | `c79a46d4-9aa6-43b2-914f-1f83419f2586` — "HF2 Skills: Paint System Selection and Room Coverage" (beginner, active, classification `simulation`) |
| GG Challenge tasks | `d05b7219-…` clean surfaces + select paint system; `9e307ffa-…` full coverage with accent; `31622ceb-…` paint system / sheen annotation (sheen, primer, sq ft at 350 sq ft/gal two coats, latex vs alkyd); `fd7d062c-…` second room, wet-area approach |

Nothing was invented and no new canonical activity was minted.

## 2. Academy Work Order authored

`a42ff4fb-663c-41ce-9737-497ff68ff196` — "Interior Surface Preparation and Painting", game_title `House_Flipper_2`, beginner, 150 XP, 75 min, visibility `public`, owner tenant FGN Global. Provenance preserved: `simulation_activity_id`, `source_challenge_id`, `fgn_origin_challenge_id`, `metadata.play_source`. Four tasks, each carrying its GG `source_task_id`; the educational framing (learning objectives, criteria) is Academy-authored, not a copy of the entertainment challenge.

| # | Task | Evidence Requirements (basis) |
|---|---|---|
| 1 | Prepare surfaces and choose the paint system | prepared_room_state (outcome_capture), paint_system_choice (outcome_capture) |
| 2 | Apply full coverage with an accent treatment | coverage_two_angles (outcome_capture, min 2 artifacts) |
| 3 | Quantity take-off and paint trade reasoning | quantity_takeoff (structured_result), material_reasoning (written_reasoning) |
| 4 | Wet-area room and adapted paint system | wet_area_result (outcome_capture), wet_area_reasoning (written_reasoning) |

7 Evidence Requirements, 17 Assessment Criteria (11 gating), 6 Task → Skill mappings.

## 3. Task → Skill mappings and the taxonomy gap

`skills_taxonomy` contained **no House_Flipper_2 keys at all** (only ATS and Fiber_Tech sets plus a legacy `House_Flipper`). The taxonomy is game-scoped via `game_title`, so no existing key genuinely fit. Four minimal keys were added under `House_Flipper_2` / category `finishing_work`: `surface_preparation`, `paint_system_selection`, `material_estimation`, `finish_application`. No taxonomy redesign was performed.

**GAP TO DECIDE:** these are finishing-trade skills that are not House Flipper 2 specific. Game-scoped keys will fragment the same real skill across games (painting also appears in other titles) and there is no cross-game rollup today. Recommended for a later phase, not now.

Mappings (all approved, v1): task 1 → surface_preparation (primary, outcome_capture, cap moderate) + paint_system_selection (supporting, cap weak); task 2 → finish_application (primary, cap moderate); task 3 → material_estimation (primary, structured_result + written_reasoning, cap strong) + paint_system_selection (primary, written_reasoning, cap moderate); task 4 → paint_system_selection (supporting, outcome_capture + written_reasoning, cap moderate).

## 4. Explicit NOT OBSERVED

`assessment_outcome` now has a fourth value `not_observed`. The reviewer screen:

- offers Met / Partially met / Not met / **Not enough shown to judge** per criterion;
- **no longer derives any criterion from the overall decision** — the previous code silently filled unassessed criteria with met/not_met. Accept, Needs revision and Not accepted are all disabled until every criterion has an explicit outcome and quality;
- disables Accept when any gating criterion is not met or not observed, with an on-screen reason.

`not_applicable` was not added — no requirement in this prototype needed it.

## 5. Curation / visibility fix

New SECURITY DEFINER report `get_work_order_visibility_report(work_order_id)` returns, for every approved community the signed-in administrator can administer (all communities for platform admins): community name, whether it is the owner tenant, whether it curates its own catalog, and whether this work order is included.

New `WorkOrderVisibilityPanel`, rendered in the work order editor above the save controls: lists each community with "shows everything" / "in their catalog" / **hidden**, a one-click Add for hidden ones, and a blocking red warning when *no* community can see the work order. Tenant curation is preserved — nothing is auto-exposed. Tested against the new HF2 work order: before curation the panel reported FGN Global as hidden; after inclusion it reports "in their catalog".

## 6. Test scenario (non-admin learner, non-platform reviewer)

Learner Maria_Roads `337abe19-…` (FGN Global, no platform role). Reviewer Sam_Diesel `2258e2ea-…` — verified `has_role(super_admin)=false`, `has_role(admin)=false`; reviews solely through tenant admin rights. Attempt `2746aaa2-…` (`user_work_order_completions`, attempt 1).

| test | result |
|---|---|
| A quantitative evidence | written take-off stored as `body_text` + `body_structured` (504 sq ft, 350 sq ft/gal, 2 coats, 2.88 → 3 gal). No screenshot of text. |
| B material-selection reasoning | written eggshell / primer / latex-vs-alkyd response, `written_reasoning`. |
| C visual outcome evidence | two screenshot artifacts for the wet-area room. |
| D multi-basis demonstration | task 3 = structured_result + written_reasoning; task 4 = outcome_capture + written_reasoning. |
| E intentional NOT OBSERVED | `different_room_type` (gating) marked not observed on the close-up shot — the requirement could not be accepted and the task returned `not_demonstrated`, 0 skill signals. |
| F revised evidence | learner submitted a wider shot; prior association deactivated, new association created. |
| G history retained | the original association survives with `is_active=false`, `needs_revision`, and both original assessment results (met + not_observed) intact. |
| H progression after revision | re-review accepted → task 4 `demonstrated`, 1 skill signal. |
| I signals only after demonstration | 3 signals total, all created by `complete_task_review` at the moment status became demonstrated. |
| J all bases retained | see table below — both contributing bases present per signal, one flagged primary. |
| K / L / M | 0 skill verifications, 0 credentials issued (none created in the window), xp_awarded 0, 0 badges, 0 achievements. |

### Skill Signals produced

| task | skill | strength (v1_three_band) | confidence | evidence bases (primary *) |
|---|---|---|---|---|
| Quantity take-off and paint trade reasoning | material_estimation | moderate | 0.60 | written_reasoning*, structured_result |
| Quantity take-off and paint trade reasoning | paint_system_selection | moderate | 0.60 | written_reasoning*, structured_result |
| Wet-area room and adapted paint system | paint_system_selection | moderate | 0.60 | outcome_capture, written_reasoning* |

Provenance on every signal carries task, work order, attempt and `simulation_activity_id` `19720a68-…`, plus the standing note that confidence is an internal evidence-strength measure, not a probability of real-world occupational skill.

## 7. Comparison with ATS signal behaviour (no recalibration performed)

| | ATS (2A) | HF2 (2B) |
|---|---|---|
| dominant basis | process_capture (video) | written_reasoning / structured_result |
| strengths produced | strong (0.85) and moderate (0.60) | moderate (0.60) only |
| ceiling reached | yes — process capture can reach strong | no — the v1 scheme caps written/structured at moderate even when every criterion is met with strong quality |

**Observation for your decision:** under v1_three_band, the most rigorously assessed evidence in the system — a learner's own quantified take-off, judged against four explicit criteria — can never exceed *moderate*, while an accepted gameplay video reaches *strong*. The scheme currently rewards capture modality over assessment rigour. Nothing was tuned; recalibration (e.g. letting criterion count/gating density and quality lift written_reasoning to strong) is recommended as an explicit v2 scheme before broader migration, kept versioned alongside v1.

## 8. Security / isolation test

| actor | artifacts | associations | write |
|---|---|---|---|
| learner (owner) | 5 | 5 | own submissions only |
| other learner (Emma_Wheeler) | 0 | 0 | — |
| other community admin (Carlos_Builder, Acme) | 0 | 0 | UPDATE affected **0 rows** |
| authorised community reviewer (Sam_Diesel, tenant admin only) | 5 | 5 | review accepted |
| signed-out visitor | 0 | — | — |

The work order is public and globally listed; that did not expose any evidence cross-tenant. Files remain in the private `evidence` bucket, reachable only through short-lived signed URLs.

## 9. Friction observed

- **Reviewer load.** Task 3 alone carries 7 criteria; the queue assesses one artifact↔requirement association at a time with no "same as last" shortcut. Workable for a prototype, heavy at scale.
- **Written evidence has no structured entry aid.** The take-off was typed as prose plus a stored structured payload; the learner UI only offers free text, so `body_structured` is not captured from real learners yet. A small structured form (dimensions, coverage, coats) would make the quantitative criteria far more consistently assessable.
- **Multi-artifact requirements.** `coverage_two_angles` requires 2 artifacts; the learner panel does not yet show progress toward `min_artifacts`.
- **Reopening a review** is reviewer-initiated; a learner's revision does not itself flag the task back into the queue.

## 10. Schema changes made during Phase 2B

1. `assessment_outcome` gained `not_observed`.
2. New function `get_work_order_visibility_report(uuid)` (SECURITY DEFINER, authenticated only, self-scoping to administered tenants).
3. Four new `skills_taxonomy` rows under `House_Flipper_2` (flagged above).

No changes to the Phase 2A tables, RLS, or progression functions.

## 11. Recommended before broader migration

1. Decide the skills taxonomy scope question (game-scoped keys vs cross-game finishing-trade skills).
2. Author a v2 signal-strength scheme so assessment rigour, not capture modality, drives strength; keep v1 intact for existing signals.
3. Add structured-response entry for quantitative requirements (`body_structured` from the learner UI).
4. Surface `min_artifacts` progress and auto-requeue a task when a learner submits revised evidence.
5. Only then consider the third prototype or catalog migration.
