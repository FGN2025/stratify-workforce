# Phase 1B cleanup + revised Phase 2 architecture (for approval)

Two parts. Part A is the small Phase 1B cleanup you approved. Part B is the
revised Phase 2 architecture, returned for approval — **no Phase 2 table is
created in this plan.**

---

# PART A — Phase 1B cleanup (implement on approval)

1. **Approve the MSFS mapping only.** Preflight Aircraft Inspection
   `b12e6fe2-…` → Work Order `eff75523-…`. Identity column only; no educational
   content touched. No other canonical ID is written.
2. **Trench pair stays in review.** Both `f4347636-…` (Fiber_Tech) and
   `f98c218c-…` (Construction_Sim) remain NEEDS REVIEW, flagged
   `duplicate_educational_record_pending_differentiation`. No activity minted,
   neither retired, no educational rewrite.
3. **Preserve the Conduit Placement and Backfill duplication** (`1c899b1a-…`)
   as a recorded pending-review item, so it surfaces the moment GG publishes a
   canonical activity for it.
4. **Console supports the architectural rule.** Add an accepted
   multi-interpretation state so a reviewed shared-activity set stops
   resurfacing; keep `duplicate_canonical_mappings` as an observation rather
   than an automatic error; add a grouped view of one activity and all Work
   Orders interpreting it.
5. **Record the three GG-only paths** as GG ONLY — ACADEMY WORK ORDER NOT YET
   AUTHORED, with your dispositions: HF2 painting = authoring candidate; ATS
   dock approach = authoring candidate and first Phase 2 evidence prototype;
   Bulk Grain Hauling = deferred. No Work Orders created. No catalog parity.
6. Docs updated in place: `docs/golden-paths-reconciliation.md`,
   `docs/phase-1b-checkpoint-summary.md`, and a new
   `docs/phase-2-evidence-skills-architecture.md` holding Part B.

---

# PART B — Revised Phase 2 architecture

## B1. Entity model

```text
Work Order ──1:N── Task ──1:N── Evidence Requirement
                     │                  │
                     │                  ├─1:N─ Assessment Criterion
                     │                  │
                     │        M:N via evidence_artifact_requirements
                     │                  │
                     │            Evidence Artifact (per learner)
                     │                  │
                     │            Assessment Result
                     │      (artifact × criterion × reviewer)
                     │
                     ├─1:N── Task Skill Mapping ──> skills_taxonomy.skill_key
                     │
                     └─1:N── Task Demonstration (per learner)
                                        │
                                  Skill Signal
                                        │
                              Skill Verification (separate, sparse, manual)
```

Cardinality summary:

| relationship | cardinality |
|---|---|
| Work Order → Task | 1:N |
| Task → Evidence Requirement | 1:N |
| Evidence Requirement → Assessment Criterion | 1:N |
| Evidence Artifact ↔ Evidence Requirement | **M:N** |
| (Artifact × Criterion) → Assessment Result | 1:1 per reviewer pass |
| Task → Task Skill Mapping | 1:N |
| (Learner × Task) → Task Demonstration | 1:1 |
| Task Demonstration → Skill Signal | 1:N |
| Skill Signal → Skill Verification | 0:1, manual only |

## B2. Proposed tables

**`work_order_task_evidence_requirements`** — evidence moves off the Work Order
and onto the task.
`id`, `task_id → work_order_tasks(id) on delete cascade`, `requirement_key`
(stable slug, unique per task), `label`, `instructions`, `evidence_type`
(enum below), `min_artifacts` default 1, `max_artifacts`, `is_required`
default true, `min_duration_seconds` (clips), `requires_pair` (before/after),
`order_index`, `created_at`, `updated_at`.

**`evidence_artifacts`** — one submission by one learner. Deliberately **not**
tied to a requirement.
`id`, `user_id`, `work_order_id`, `artifact_kind` (`file` | `text`),
`storage_path`, `mime_type`, `duration_seconds`, `body_text`,
`body_structured jsonb` (structured annotations), `title`, `captured_at`,
`submitted_at`, `status` (artifact lifecycle enum), `superseded_by_artifact_id`,
`created_at`, `updated_at`.
Written annotations are stored as real text in `body_text` /
`body_structured`. Screenshots of text are never required.

**`evidence_artifact_requirements`** — the M:N association you asked for.
`id`, `artifact_id → evidence_artifacts`, `requirement_id →
work_order_task_evidence_requirements`, `learner_rationale` (why this artifact
evidences this requirement), `association_status` (`claimed` | `accepted` |
`rejected`), `reviewed_by`, `reviewed_at`, `created_at`.
Unique on (`artifact_id`, `requirement_id`).
Governing rule enforced here: one ATS process video may be associated with
mirror discipline, approach control and trailer positioning at once — no
duplicate uploads — but **each association is assessed separately against that
requirement's own criteria**, and every required requirement must be
independently satisfied.

**`assessment_criteria`** — the rubric that does not exist today.
`id`, `requirement_id`, `criterion_key`, `criterion_text`,
`guidance_for_reviewer`, `weight`, `is_gating`, `order_index`, `is_active`,
`created_at`, `updated_at`.

**`assessment_results`** — human judgement, one per association × criterion.
`id`, `artifact_requirement_id → evidence_artifact_requirements`,
`criterion_id → assessment_criteria`, `outcome`
(`met` | `partially_met` | `not_met`), `reviewer_id`, `reviewer_note`,
`evidence_quality` (enum below), `reviewed_at`, `created_at`.
Unique on (`artifact_requirement_id`, `criterion_id`, `reviewer_id`).

**`task_skill_mappings`** — explicit, curated, never inferred from titles.
`id`, `task_id`, `skill_key` (references an existing `skills_taxonomy` key),
`relationship` (`primary` | `supporting` | `prerequisite_context`),
`expected_evidence_basis` (array of the basis enum),
`max_signal_strength` (cap the strongest signal this task may ever produce),
`rationale`, `mapping_version` int default 1, `is_active`,
`approved_by`, `approved_at`, `created_at`, `updated_at`.
Unique on (`task_id`, `skill_key`, `mapping_version`).
A mapping only takes effect when `approved_by` is set — no automatic inference.

**`task_demonstrations`** — per learner per task, computed, never a mere
"evidence exists" flag.
`id`, `user_id`, `task_id`, `work_order_id`, `status`
(`not_started` | `evidence_submitted` | `under_review` | `needs_revision` |
`demonstrated` | `not_demonstrated`), `demonstrated_at`,
`reviewed_by`, `review_completed_at`, `computed_note jsonb`,
`created_at`, `updated_at`. Unique on (`user_id`, `task_id`).

**`skill_signals`** — evidence-supported information, not a credential.
`id`, `user_id`, `skill_key`, `task_demonstration_id`, `task_skill_mapping_id`,
`evidence_basis`, `signal_strength_scheme` (versioned, see B4),
`signal_strength_value`, `confidence` numeric 0–1, `provenance jsonb`,
`observed_at`, `is_superseded`, `created_at`.

**`skill_verifications`** — deliberately sparse, manual only.
`id`, `user_id`, `skill_key`, `verified_by` (explicit verifier),
`verification_policy_ref` (required text), `basis_signal_ids uuid[]`,
`verified_at`, `expires_at`, `revoked_at`, `revocation_reason`, `notes`,
`created_at`. **No trigger, function or job may insert here.** Writes come from
an explicit human verification action only, and this table connects to no
credential issuance in Phase 2.

## B3. Status enums

| enum | values |
|---|---|
| `evidence_type` | `screenshot`, `video_clip`, `before_after_pair`, `written_annotation`, `structured_form`, `document` |
| artifact `status` | `draft`, `submitted`, `under_review`, `accepted`, `rejected`, `needs_revision`, `superseded` |
| `association_status` | `claimed`, `accepted`, `rejected` |
| `outcome` | `met`, `partially_met`, `not_met` |
| task demonstration `status` | `not_started`, `evidence_submitted`, `under_review`, `needs_revision`, `demonstrated`, `not_demonstrated` |
| `relationship` | `primary`, `supporting`, `prerequisite_context` |
| `evidence_basis` | `outcome_capture`, `process_capture`, `written_reasoning`, `structured_result`, `human_observation`, `telemetry` |
| `evidence_quality` | `insufficient`, `adequate`, `strong` |

`telemetry` is defined as a type now; nothing ingests telemetry in Phase 2.

## B4. Evidence basis, quality and strength — recommendation

Keep three separate concepts, and do not freeze the third.

1. **Evidence basis** — *what kind of proof this is*. A fixed Postgres enum on
   the requirement and carried onto the signal. Stable, six values above.
2. **Evidence quality** — *how good this particular submission is*. Recorded by
   the reviewer on each assessment result (`insufficient` / `adequate` /
   `strong`). A property of the artifact-in-context, not of the skill.
3. **Signal strength / confidence** — *how much this demonstration tells us
   about the skill*. **Do not hard-code weak/moderate/strong.** Recommendation:
   store it as a versioned scheme — `signal_strength_scheme` (text, e.g.
   `v1_three_band`) plus `signal_strength_value` (text) plus a numeric
   `confidence` 0–1. A small `signal_strength_schemes` reference table defines
   the allowed values per scheme. That lets us test a three-band scheme now and
   replace it with a numeric or multi-factor model later without a migration of
   historical signals, because each row records the scheme it was computed under.

A sensible v1 derivation, subject to testing: strength rises with process and
written-reasoning bases and with reviewer-assessed quality, and is capped by
`task_skill_mappings.max_signal_strength`. Outcome-only capture can never
produce the top band.

## B5. Lifecycles

**Evidence Artifact**
`draft` → `submitted` (learner associates it with one or more requirements) →
`under_review` → `accepted` | `rejected` | `needs_revision`. A revised upload
creates a new artifact and sets `superseded_by_artifact_id` on the old one;
nothing is deleted. Association status is tracked per requirement, so one
artifact can be accepted for mirror discipline and rejected for trailer
positioning.

**Task Demonstration**
`not_started` → `evidence_submitted` (at least one association exists) →
`under_review` → `needs_revision` (a gating criterion not met) → `demonstrated`
**only when all three hold**: every required requirement independently
satisfied by at least one accepted association; every gating criterion `met`;
the required human review completed. Otherwise `not_demonstrated`. Evidence
existing never advances this by itself.

**The four boundaries, and what enforces each**

| boundary | enforced by |
|---|---|
| Evidence collected | a row in `evidence_artifacts` — existence alone proves nothing |
| ≠ Task demonstrated | `task_demonstrations`, three conditions above |
| ≠ Skill signal | `skill_signals`, an inference with basis, strength and confidence, always traceable, never a pass |
| ≠ Skill verified | `skill_verifications`, human verifier plus policy reference, no automatic path |

## B6. Skill signal provenance

Every signal resolves the full chain by foreign key, with no title matching at
any hop:

```text
skill_signal
  → task_demonstration      (user, task, status, review)
    → assessment_results    (outcome per criterion)
      → evidence_artifact_requirements
        → evidence_requirements  and  evidence_artifacts
          → work_order_tasks
            → work_orders
              → work_orders.simulation_activity_id   (where applicable)
                → GG challenge via fgn_origin_challenge_id / source_challenge_id
```

Academy-native Work Orders carry no activity ID and the chain simply ends at
the Work Order — that remains valid.

## B7. Taxonomy findings (report only, no redesign)

`skills_taxonomy` exists with `skill_key`, `skill_name`, `category`,
`game_title`. There are **no duplicate skill keys** today. Two issues to record
for later review, not fixed in Phase 2:

- Skills are scoped per game via `game_title`, so genuinely cross-industry
  skills (PPE, site safety) will fragment as more games are added.
- The ATS set already supports the prototype: `backing_maneuvers`, `docking`,
  `defensive_driving`, `route_planning`. No new keys are needed for it.

## B8. Migration strategy and historical evidence

Additive only; nothing is dropped.

1. Create the new tables; existing `work_orders.evidence_requirements` JSON is
   left untouched and still read.
2. A backfill generates one per-task requirement per task for existing Work
   Orders, derived from the Work Order blob, marked
   `provenance = 'derived_from_legacy_blob'`. Derived requirements carry no
   criteria and cannot produce a `demonstrated` status until an admin authors
   criteria — so no legacy Work Order silently starts issuing signals.
3. Readers prefer per-task requirements when present, else the legacy blob.
4. **Historical evidence** (existing `work_order_evidence` rows) is imported as
   `evidence_artifacts` with `status = 'accepted'` where it was already approved,
   associated to the derived requirement for its Work Order, and marked
   `is_legacy = true`. Legacy artifacts **never** generate skill signals — they
   were collected under no rubric. Existing completions, XP and credentials are
   unaffected.
5. The ATS prototype is authored natively with real per-task requirements, not
   derived ones.

## B9. ATS worked example — Trailer Positioning and Dock Approach

```text
GG Challenge      ATS Skills: Precision Backing and Dock  f969023f-…
  → Canonical Simulation Activity  Trailer Positioning and Dock Approach  b6e90c9b-…
    → Academy Work Order  (to be authored; carries simulation_activity_id)
```

| Task | Skill mapping | Evidence requirements | Assessment criteria (gating marked *) |
|---|---|---|---|
| 1. Straight-line reverse, finish centered | `backing_maneuvers` primary, cap moderate, basis outcome_capture | `final_position_shot` (screenshot) | trailer centered within bay markings*; tractor and trailer in line |
| 2. Offset backing into adjacent box | `backing_maneuvers` primary, basis outcome_capture | `offset_final_shot` (screenshot) | trailer fully inside target box*; no contact with adjacent obstacle* |
| 3. 90-degree alley dock | `docking` primary, basis outcome_capture | `alley_dock_shot` (screenshot) | squared to dock face*; within dock tolerance |
| 4. Mirror discipline, early drift correction | `defensive_driving` primary, `backing_maneuvers` supporting, basis process_capture, cap strong | `mirror_discipline_clip` (video_clip, min 30s) | mirror checks visible before each correction*; drift corrected early rather than at the end; continuous unedited take* |
| 5. Setup position paired with final position | `route_planning` supporting, `docking` primary, basis `before_after_pair` + written_reasoning | `setup_pair` (before_after_pair) and `setup_rationale` (written_annotation) | setup angle visible in the before frame*; annotation explains why that setup was chosen*; annotation names a stop condition |

**How one video serves three requirements.** The learner uploads a single
continuous clip. They associate it with `mirror_discipline_clip`, and — if it
also shows the alley dock and the setup — with `alley_dock_shot` and
`setup_pair`, adding a short rationale per association. Three rows in
`evidence_artifact_requirements`, one artifact, no duplicate upload. The
reviewer then judges it **separately** against each requirement's criteria: it
may be accepted for mirror discipline and rejected for the alley dock if the
dock face is out of frame. In that case task 3 is not satisfied and cannot be
demonstrated, even though the artifact exists and was accepted elsewhere.

**Then:** each task reaching all-required-satisfied + all-gating-met + review
complete becomes a `task_demonstration`. Each demonstration emits signals
through its approved `task_skill_mappings` — task 4 can emit a strong
`defensive_driving` signal because its basis is process capture; tasks 1–3 emit
`backing_maneuvers` and `docking` signals capped at moderate because their basis
is outcome capture only. **No skill verification and no credential is issued by
any of this.**

## B10. Explicitly out of scope

No AI scoring (human review only), no telemetry ingestion, no new credential
types, no Skills Taxonomy redesign, no retroactive XP or badges, no learner UI
redesign, no `success_criteria` recalibration.

---

## What happens on approval

Part A is implemented (six items above). Part B is written to
`docs/phase-2-evidence-skills-architecture.md` as the approved architecture.
**No Phase 2 table is created until you approve Part B specifically.**
