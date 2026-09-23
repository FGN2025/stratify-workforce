# Phase 2C — Skills Foundation + Evidence Workflow Hardening

Status: complete, stopped at the Phase 2C review gate. No third prototype, no catalog migration.

---

## A. Skills taxonomy migration report

### Current (pre-2C) model — inspected before change

`skills_taxonomy (id, game_title ENUM, skill_key, skill_name, category, description, sort_order, is_active)`,
unique on **(game_title, skill_key)** — i.e. identity was game-scoped.

Consumers found (exhaustive grep of `src/`, `supabase/functions/`, DB objects):

| Consumer | Use |
|---|---|
| `supabase/functions/public-catalog/index.ts` (2 places) | public skill catalog listing, reads `skill_key, skill_name, category, description` |
| `supabase/functions/play-webhook-receiver`, `_shared/learning-source/handlers.ts` | accept a free-text `skill`/`skill_key` on inbound payloads |
| `task_skill_mappings.skill_key` (text, no FK) | authored Task → Skill mapping |
| `skill_signals.skill_key` (text, no FK) | historical signals (6 rows) |
| `skill_verifications.skill_key` (text, no FK) | dormant, 0 rows |
| `skill_credentials.skills_verified text[]`, `career_path_requirements.match_value` | credential/career matching by loose key |
| Admin + profile UI (`SkillRadar`, `PublicPassport`, career paths manager) | display only |

No foreign keys point at `skills_taxonomy`; every reference is by **text key**. No duplicate `skill_key` exists across games today (verified), so the migration is collision-free.

### Canonical model (additive, nothing deleted or rewritten)

```
canonical_skills (id, skill_key UNIQUE, skill_name, description, domain,
                  classification, status, version, provenance jsonb, review_note)
skill_aliases   (id, alias_key, game_title NULL-able, canonical_skill_id FK, source, note)
```

* `canonical_skills` has **no game_title**. Game context now comes only through the evidence chain.
* `skill_aliases` carries one row per historical game-scoped taxonomy row **plus** one game-independent row per key (`game_title NULL`), so both `('material_estimation','House_Flipper_2')` and bare `'material_estimation'` resolve.
* `resolve_canonical_skill(skill_key, game_title)` — deterministic: game-scoped alias wins, then the game-independent alias. No fuzzy or AI matching anywhere.
* View `skill_signals_canonical` resolves every existing signal to its canonical skill plus the game, work order and simulation activity it was observed in. All **6/6** historical signals resolve.
* `task_skill_mappings.canonical_skill_id` added and backfilled; `skill_key` remains authoritative for history.

`skills_taxonomy`, existing signals and existing mappings were **not** modified (other than the additive `canonical_skill_id` backfill on mappings).

### Classification (28 canonical skills)

| Classification | Skills |
|---|---|
| Transferable | `material_estimation`, `ppe_compliance`, `tool_maintenance` |
| Domain-specific — transport/logistics | `backing_maneuvers`, `brake_systems`, `cargo_securement`, `coupling_uncoupling`, `defensive_driving`, `docking`, `hazmat_handling`, `parallel_parking`, `pre_trip_inspection`, `route_planning` |
| Domain-specific — telecom/fiber | `cable_routing`, `connector_termination`, `fiber_handling`, `fiber_splicing`, `otdr_testing`, `power_meter` |
| Domain-specific — finishing trades | `surface_preparation`, `paint_system_selection`, `finish_application` |
| Simulation/game-specific measure | none identified |
| **Needs administrative review** | `documentation`, `time_management`, `ladder_safety`, `trench_safety`, `vehicle_equipment`, `fuel_management` |

Ambiguous cases were **not** merged or renamed. Each carries a `review_note`: the name may describe a capability broader than the trade it was authored under (e.g. `trench_safety` is construction-wide, not fiber-specific; `documentation` and `time_management` are generic names that risk colliding with unrelated future skills).

* **HF2 migration** — the four Phase 2B keys became canonical skills in the `finishing_trades` domain, classified domain-specific (transferable across painting/finishing trades, not House Flipper 2 measures). `House_Flipper_2` was not removed from the taxonomy rows; the alias resolves them.
* **ATS migration** — the twelve ATS keys became canonical transport/logistics skills; `defensive_driving` is explicitly domain-specific, not ATS-specific.
* **Fiber migration** — twelve keys; six domain-specific, four flagged for review, `ppe_compliance` and `tool_maintenance` promoted to transferable with `cross_domain` domain.

**Historical compatibility:** old references resolve as `skill_key (+ game) → skill_aliases → canonical_skills`. Nothing reads `canonical_skills` in a way that can break existing pages; the public catalog and passport still read the legacy table unchanged.

---

## B. Signal Strength v2 specification

New scheme row `v2_fit_weighted` in `signal_strength_schemes`. `v1_three_band` is untouched and still valid for existing signals.

Mappings now declare, per skill, `direct_evidence_bases[]` and `supporting_evidence_bases[]` — strength is judged against **this mapping**, never against a global modality ranking.

Factors and weights (`compute_signal_strength_v2(demonstration, mapping)`):

| Factor | Weight | Definition |
|---|---|---|
| Evidence-to-skill fit | 0.30 | 1.0 if an accepted basis is *direct* for this skill, 0.5 if only supporting, 0.2 otherwise |
| Assessment quality | 0.30 | mean of (met 1.0 / partially 0.5 / not met or not observed 0) × (strong 1.0 / adequate 0.85 / insufficient 0.4) |
| Gating coverage | 0.20 | share of gating criteria on required requirements explicitly observed **and** met |
| Evidence coverage | 0.15 | share of the task's active requirements with accepted evidence |
| Evidence diversity | 0.05 | only when the mapping itself treats several bases as direct; never a substitute for directness |

Bands: ≥ 0.80 strong, ≥ 0.55 moderate, else weak. Two hard rules override the band:
* no **strong** without at least one *direct* basis for that skill;
* no **strong** if any gating criterion was not observed or not met.
Then the mapping's `max_signal_strength` cap applies.

Versioning: scheme key is stored on each signal. New signals are written as `v2_fit_weighted`; nothing rewrites v1 rows. `shadow_signal_strength_v2(signal_id)` computes v2 for an existing signal **read-only**.

Confidence interpretation (unchanged boundary, restated in `provenance.note` on every signal): confidence is an internal measure of how strongly the collected evidence supports this observed demonstration. It is **not** a probability that a person holds a real-world occupational skill, not job-readiness, not certification. Skill Signal ≠ Skill Verification ≠ Credential ≠ Employment qualification.

---

## C. v1 vs v2 shadow comparison (existing signals, nothing overwritten)

| Game | Skill | v1 | v1 conf | v2 shadow | v2 conf | Accepted bases | Why v2 differs |
|---|---|---|---|---|---|---|---|
| ATS | defensive_driving | strong | 0.85 | strong | 0.95 | process_capture | Direct basis, all criteria met, all gating observed — unchanged verdict |
| ATS | backing_maneuvers | moderate | 0.60 | moderate | 0.95 | process_capture | Direct and fully assessed, but the mapping caps this supporting relationship at moderate |
| ATS | docking | moderate | 0.60 | moderate | 0.80 | outcome_capture | Outcome-only evidence is *supporting*, not direct, for docking → fit 0.5, and the "no strong without a direct basis" rule holds it at moderate even before the cap |
| HF2 | material_estimation | moderate | 0.60 | **strong** | 0.99 | written_reasoning + structured_result | Both bases are *direct* for estimation; rigorous full assessment now earns strong instead of being capped by modality |
| HF2 | paint_system_selection (take-off task) | moderate | 0.60 | moderate | 0.99 | written_reasoning + structured_result | Fit and quality are maximal; the mapping's own moderate cap is what limits it, not the modality |
| HF2 | paint_system_selection (wet-area task) | moderate | 0.60 | moderate | 0.95 | outcome_capture + written_reasoning | Direct written reasoning plus supporting outcome; limited by the mapping cap |

Both requested tests pass: HF2 `material_estimation` reaches **strong** on rigorous calculation + reasoning, and outcome-only visual evidence (ATS docking) does **not** become strong regardless of image quality.

Observation for your decision: v2 confidence numbers cluster high (0.80–0.99) because these prototype submissions were fully assessed and fully covered. The band thresholds, not the confidence number, carry the meaning; recommend we do not surface the raw number to learners.

---

## D. Structured evidence implementation

`work_order_task_evidence_requirements.response_schema jsonb` defines a configurable form — not painting-specific:

```json
{"fields":[{"key","label","type":"number|integer|text|select","unit","required","min","max","options","order","reviewer_guidance"}]}
```

Learner answers are stored in `evidence_artifacts.body_structured` (the existing column); the artifact kind is `structured`. The learner UI renders the fields, enforces required/numeric/min/max/integer validation, and never stores a screenshot of typed text.

HF2 quantity take-off requirement now defines: measured area (sq ft), coverage rate (sq ft/gal), number of coats, calculated quantity (gal), quantity you would buy (gal), units (imperial/metric), assumptions and reasoning. Reviewer guidance is attached per field ("judge the explanation, not only the final number"). The same mechanism supports distance/time, load, fuel and yield calculations with no code change.

---

## E. Learner evidence progress changes

* Requirements with `min_artifacts > 1` now show explicit progress: "1 of 2 required submitted — 1 more still needed before this can be reviewed." (HF2 "Finished room from two angles" is the live case.)
* Structured requirements present labelled fields with units instead of an empty text box.
* Per-requirement status, prior rounds and reviewer notes remain visible; revisions never overwrite history.

---

## F. Revision auto-requeue test

Trigger `trg_requeue_task_on_revision` on `evidence_artifact_requirements`: when a learner submits a new association for a requirement that already has a `needs_revision` or `rejected` round, the task's review is reopened (`review_completed_at` cleared) and recomputed, so the item reappears in the authorized reviewer queue automatically.

Test (learner Maria_Roads, HF2 attempt, "Room shown prepared before any paint"):

| Step | Result |
|---|---|
| First photo reviewed, gating criterion `not_observed`, decision needs revision | demonstration `needs_revision`, `review_completed_at` set |
| Learner submits wider replacement | demonstration back to `evidence_submitted`, `review_completed_at` cleared, reviewer cleared |
| New association | `claimed` — visible in the reviewer queue with no manual reopen |
| Original association | retained, `is_active=false`, status `needs_revision`, its 1 assessment result intact |
| Skill signals created by the requeue | 0 |

---

## G. Reviewer-efficiency changes

* Criteria are grouped: "Must be met to accept" (gating) first, then "Additional points".
* Structured responses render as a labelled table with per-field reviewer guidance instead of raw JSON.
* Earlier submissions for the same point are shown inline with their prior outcomes, quality and reviewer note, so a revision review is anchored on what was previously not met or not shown.
* Each criterion shows its previous outcome as context — **as read-only text, never pre-filled**.
* No automatic criterion filling was restored: a decision is still blocked until every criterion has an explicit human outcome and quality, and Accept stays disabled while any gating criterion is not met or not observed. No AI review anywhere.

---

## H. Security / RLS regression results

| Check | Result |
|---|---|
| Signed-out reads canonical skills | 0 rows |
| Signed-out reads skill aliases | 0 rows |
| Signed-out reads evidence | 0 rows |
| Learner reads canonical skills | 28 rows (read-only) |
| Learner writes canonical skills | 0 rows changed (blocked) |
| Learner sees own evidence | 9 artifacts |
| Learner sees own resolved signals | 6 (1:1, no duplication) |
| Another learner sees that evidence | 0 |
| Another community's admin sees that evidence | 0 |
| Authorized community reviewer sees it | 9 |
| Private files | signed-URL access only, unchanged |

Database linter is back at the pre-Phase-2C baseline (54/54 pre-existing SECURITY DEFINER notices, 1 pre-existing view, 1 extension). New helpers (`compute_signal_strength_v2`, `shadow_signal_strength_v2`, `requeue_task_on_revision`) are not callable by `anon` or `authenticated`; `resolve_canonical_skill` runs as the caller.

Phase 2B curation behaviour (visibility report + blocking warning in the authoring dialog) is untouched and still in place.

---

## I. Schema changes

New: `canonical_skills`, `skill_aliases`, enum `skill_classification`, view `skill_signals_canonical`, functions `resolve_canonical_skill`, `compute_signal_strength_v2`, `shadow_signal_strength_v2`, `requeue_task_on_revision` + trigger, scheme row `v2_fit_weighted`.
Altered (additive only): `task_skill_mappings` + `canonical_skill_id`, `direct_evidence_bases`, `supporting_evidence_bases`; `work_order_task_evidence_requirements` + `response_schema`; `create_skill_signals_for_demonstration` now writes v2.
Unchanged: `skills_taxonomy`, existing signals, verifications (still dormant, 0 rows), credentials, XP, badges, Skill Passport, challenge sync, canonical activity mappings.

---

## J. Readiness recommendation

The platform is **ready for a staged migration, not a bulk one**. Before broader Academy migration:

1. Resolve the six `needs_review` skills administratively (they are the only ones that could fragment cross-game rollup).
2. Decide whether legacy Work Orders adopt task-level evidence at all — most have only the old work-order-level bucket, and migrating them mechanically would fabricate task attribution we have explicitly forbidden.
3. Author `direct_evidence_bases` deliberately for each new mapping; defaults copied from `expected_evidence_basis` are a starting point, not a judgement.
4. Keep confidence numbers internal; expose bands only.

Recommended next step is one further authored prototype in a third domain (ATS dock approach is already approved) migrated under v2 from the start, then a per-industry rollout — not a catalog-wide conversion.
