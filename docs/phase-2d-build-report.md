# Phase 2D — Skills Governance + Staged Academy Migration

**Status: STOPPED AT REVIEW GATE.** Nothing beyond the four approved Level 3 assignments has been
migrated. No catalog-wide conversion was performed. Skill Verification, credentials, XP and badges
remain dormant.

---

## A. Skill resolutions (the six `needs_review` skills)

All historical keys are preserved as `skill_aliases`; no historical Skill Signal was rewritten.
No generic "Documentation" skill exists.

| Old key | Resolved canonical skill | Domain | Classification |
|---|---|---|---|
| documentation | `infrastructure_field_documentation` — Infrastructure Field Documentation | infrastructure_trades | domain_specific |
| time_management | `schedule_adherence` — Schedule Adherence | transport_logistics | domain_specific |
| ladder_safety | `working_at_height_safety` — Ladder & Working-at-Height Safety | occupational_safety | transferable |
| trench_safety | `excavation_trench_safety` — Excavation & Trench Safety (de-scoped from fiber) | construction_utilities_safety | domain_specific |
| vehicle_equipment | `vehicle_equipment_care` — Vehicle & Equipment Care | fleet_equipment_operations | domain_specific |
| fuel_management | `fuel_efficiency_management` — Fuel Efficiency Management | transport_equipment_operations | domain_specific |

## B. Final canonical skill inventory

35 canonical skills, none game-owned. Seven were authored for this phase to support the
construction/fiber validation: `excavation_planning`, `earthmoving_equipment_operation`,
`grade_depth_control`, `spoil_management`, `site_restoration` (civil_earthworks),
`utility_locate_awareness` (construction_utilities_safety), `conduit_bedding_preparation`
(underground_infrastructure). Each is version 1 with provenance `{"authored":"phase_2d"}`.
Zero skills remain in `needs_review`.

## C. Migration maturity model

`work_order_migration_maturity` records deliberate administrative approvals; the
`work_order_migration_readiness` view computes *eligibility* only and never promotes anything.

- **Level 1 — canonically connected.** Linked to a canonical simulation activity (or legitimately
  Academy-native). Existing behaviour unchanged; no skill claims.
- **Level 2 — skills mapped.** Every task carries an approved Task → Canonical Skill mapping.
  Still produces no Skill Signal.
- **Level 3 — evidence validated.** Task-level Evidence Requirements, Assessment Criteria with
  must-pass gating, authored direct/supporting evidence bases, human review, Task Demonstration,
  Skill Signal eligibility. ATS `3b9cd4ba` and HF2 `a42ff4fb` are the reference implementations.

Approved today: 4 assignments at Level 3 (ATS, HF2, Construction, Fiber). Everything else sits at
Level 0 and is untouched.

## D/E. The two trenching Work Orders, before and after

Both now share canonical simulation activity `086eefb4-bff0-4826-8543-22864689cd2e`; the
reconciliation record is `ACCEPTED_MULTI_INTERPRETATION`, resolved. No second canonical activity
was created, and no task id changed.

| | Construction `f98c218c` | Fiber `f4347636` |
|---|---|---|
| Title | Excavation and Trenching Operations | Underground Communications Trench Preparation |
| Objective | General excavation and trenching operations | Trench preparation for underground communications infrastructure |
| Tasks | 5 (ids unchanged) | 5 (ids unchanged) |
| Evidence requirements | 8 | 9 (two structured_form with `response_schema`) |
| Assessment criteria | 17 (10 must-pass) | 21 (16 must-pass) |
| Approved skill mappings | 9 | 7 |

Shared skills (same underlying activity): `excavation_trench_safety`, `grade_depth_control`,
`site_restoration`. Divergent skills: Construction adds `excavation_planning`,
`earthmoving_equipment_operation`, `spoil_management`; Fiber adds `utility_locate_awareness`,
`conduit_bedding_preparation`, `infrastructure_field_documentation`. The interpretations differ in
objective, mappings, requirements, criteria and educational reading — not in cosmetics. Neither
claims regulatory compliance or real-world qualification; both stay inside what the simulation
actually supports.

## F. Evidence design

Direct and supporting evidence bases, and a maximum signal strength, are authored on every mapping.
Bases in use: `process_capture`, `outcome_capture`, `written_reasoning`, `structured_result`.
Fiber depth/separation and field-record steps use structured quantitative responses.

## G. Controlled learner tests

One non-admin learner per interpretation, separate attempts, reviewed by a community reviewer with
no platform powers.

- Maria_Roads → Construction; Emma_Wheeler → Fiber; reviewed by Sam_Diesel.
- Every requirement submitted, every criterion explicitly assessed, all associations accepted.
- 10 demonstrated Task Demonstrations, 16 Skill Signals.

## H. v2 signals and provenance

All 16 new signals use `v2_fit_weighted` (8 strong, 6 moderate, 2 weak) and each carries the shared
`simulation_activity_id 086eefb4-…` in provenance alongside its own work order. The six historical
`v1_three_band` signals were left exactly as they were. Raw confidence stays internal; learners see
Weak / Moderate / Strong with an explanation. v2 differs from v1 by weighting evidence fit: rigorous
written and structured reasoning now scores alongside camera capture instead of below it.

Verifications: 0. Credentials: 0. XP: 0. Badges: 0. No duplicate awards across the two attempts.

## I. Security / RLS regression

| Actor | Result |
|---|---|
| Learner (Emma) | 10 own artifacts; 0 other learners' artifacts; 0 other learners' signals; 0 migration records |
| Community reviewer | 29 artifacts / 58 assessment results inside their community; 0 migration records |
| Admin of another community | 0 artifacts, 0 results, 0 demonstrations, 0 migration records |
| Signed out | 0 everywhere; migration readiness denied outright |

Evidence files remain private and reachable only through short-lived signed URLs.

## J. Console

Activity Mapping now carries a **Migration maturity** list — canonical activity, level, and a plain
reason for every level not yet reached — plus an **Industry rollout** table with totals, level
counts, assignments with no activity, Academy-native counts, skill gaps and evidence gaps. Promotion
is a button an administrator presses; nothing self-promotes.

Current rollup: construction 2/2/2 Level 3, residential trades 1, transportation 1, aviation 1 at
Level 0, and 54 assignments with no canonical activity recorded.

## K. Defect fixed

Structured responses were being written with an artifact kind the database rejects; structured
submissions now store correctly.

## L. Out of scope, untouched

FGN.GG, Merits, Maritime, Railroading, Sim Racing. No AI assessment, telemetry changes, Skill
Passport redesign, or credential work.

## M. Recommended rollout order

1. Transportation (ATS pattern already proven) — highest volume, lowest authoring cost.
2. Construction / civil earthworks — canonical skills and criteria now exist to copy from.
3. Fiber / underground infrastructure — reuses the same activity with its own interpretation.
4. Residential trades (HF2 pattern).
5. Aviation last — no evidence design exists yet and the taxonomy gap is real.

Each industry should be promoted Work Order by Work Order: review the assignment, review its tasks,
author mappings, author evidence requirements, author criteria, then approve Level 3.
