# Phase 2 — Evidence + Skills Architecture (proposed, not implemented)

Status: **APPROVED IN PRINCIPLE, NOT IMPLEMENTED.** No Phase 2 tables have been created.
Nothing in this document runs. It is the design of record awaiting an explicit build
instruction.

Out of scope for Phase 2: AI scoring of any kind, telemetry ingestion, new credential
types or issuance, Skills Taxonomy redesign, retroactive XP or badges, learner UI
redesign, recalibration of existing `success_criteria`.

---

## 1. The problem this solves

Today a Work Order carries a single generic evidence bucket (`work_orders.evidence_requirements`,
typically "1–5 uploads"). A four-task assignment can therefore be satisfied by one
screenshot. There is no way to say "task 3 requires a continuous video, task 5 requires a
written rationale", no review criteria, and no traceable path from an upload to a claim
about a person's skill.

Four distinctions must remain permanently separate and are never collapsed:

```text
Evidence collected  ≠  Task demonstrated  ≠  Skill signal  ≠  Skill verified
```

---

## 2. Entity model

```text
Work Order
  └─ Task  (work_order_tasks, exists today)
       ├─ Task Skill Mapping ──► skills_taxonomy (explicit, human approved)
       └─ Evidence Requirement  (one per thing that must be shown)
             ├─ Assessment Criterion  (what a reviewer checks; some are gating)
             └─ ◄── Evidence Artifact Requirement (M:N) ──► Evidence Artifact
                        └─ Assessment Result  (per criterion, per association)
  Task Demonstration  (per user, per task — computed from the above + human review)
       └─ Skill Signal  (per approved mapping; not a credential)
              └─ Skill Verification  (separate, sparse, human only)
```

Cardinality:

| Relationship | Cardinality |
| --- | --- |
| Work Order → Task | 1:N |
| Task → Evidence Requirement | 1:N |
| Task → Task Skill Mapping | 1:N |
| Evidence Requirement → Assessment Criterion | 1:N |
| Evidence Artifact ↔ Evidence Requirement | **M:N** via `evidence_artifact_requirements` |
| Artifact-Requirement association → Assessment Result | 1:N (one per criterion per reviewer) |
| User + Task → Task Demonstration | 1:1 |
| Task Demonstration → Skill Signal | 1:N |
| Skill Signal → Skill Verification | N:1, never automatic |

---

## 3. Proposed tables

### 3.1 `work_order_task_evidence_requirements`

Per-task, replaces the generic blob for newly authored content.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid → work_order_tasks | cascade |
| requirement_key | text | unique per task |
| label | text | learner-facing |
| instructions | text | what to capture |
| evidence_type | enum `evidence_type` | see §5 |
| evidence_basis | enum `evidence_basis` | see §5 |
| min_artifacts / max_artifacts | int | default 1 / 1 |
| is_required | boolean | default true |
| min_duration_seconds | int null | for video |
| requires_pair | boolean | before/after |
| order_index | int | |
| provenance | text | `authored` or `derived_from_legacy_blob` |
| is_active | boolean | |

Unique: (`task_id`, `requirement_key`).

### 3.2 `evidence_artifacts`

A thing the learner produced. Deliberately **not** tied to a requirement.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid | |
| work_order_id | uuid | |
| artifact_kind | text | `file` or `text` |
| storage_path | text null | private bucket, signed URL reads |
| mime_type, duration_seconds | | |
| body_text | text null | written annotations stored as real text |
| body_structured | jsonb null | structured form answers |
| title, captured_at, submitted_at | | |
| status | enum | draft / submitted / under_review / accepted / rejected / needs_revision / superseded |
| superseded_by_artifact_id | uuid null | revision chain |
| is_legacy | boolean | imported historical evidence |

### 3.3 `evidence_artifact_requirements` (the many-to-many)

One legitimate artifact may support several requirements — a single ATS process clip can
contain mirror discipline, approach control and trailer positioning.

| Column | Type |
| --- | --- |
| id | uuid pk |
| artifact_id | uuid → evidence_artifacts |
| requirement_id | uuid → work_order_task_evidence_requirements |
| learner_rationale | text null |
| association_status | enum: claimed / accepted / rejected |
| reviewed_by, reviewed_at | |

Unique: (`artifact_id`, `requirement_id`).

**Governing rule.** Every required Evidence Requirement must be **independently
satisfied**. An artifact may serve several requirements only when it is explicitly
associated with each one, each association carries that requirement's own assessment
criteria, and the artifact is assessed against those criteria separately. The same file is
never uploaded twice merely to satisfy the data model — and acceptance for one requirement
never implies acceptance for another.

### 3.4 `assessment_criteria`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| requirement_id | uuid | |
| criterion_key, criterion_text | text | |
| guidance_for_reviewer | text | |
| weight | numeric | |
| is_gating | boolean | a gating criterion must be met for demonstration |
| order_index, is_active | | |

### 3.5 `assessment_results`

| Column | Type |
| --- | --- |
| id | uuid pk |
| artifact_requirement_id | uuid → evidence_artifact_requirements |
| criterion_id | uuid → assessment_criteria |
| outcome | enum: met / partially_met / not_met |
| evidence_quality | enum: insufficient / adequate / strong |
| reviewer_id, reviewer_note, reviewed_at | |

Unique: (`artifact_requirement_id`, `criterion_id`, `reviewer_id`). Human review only.

### 3.6 `task_skill_mappings`

Explicit. Never inferred from titles, never AI-generated.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid | |
| skill_key | text → skills_taxonomy | existing keys used where they exist |
| relationship | enum: primary / supporting / prerequisite_context | |
| expected_evidence_basis | enum array | which bases can support this claim |
| max_signal_strength | text | cap; outcome-only capture can never reach the top band |
| rationale | text | |
| mapping_version | int | |
| is_active | boolean | |
| approved_by, approved_at | | **a mapping is effective only when approved_by is set** |

Unique: (`task_id`, `skill_key`, `mapping_version`).

Taxonomy note: `skills_taxonomy` currently has no duplicate keys, but entries are scoped
per game via `game_title`, so cross-industry skills will fragment as more games arrive.
Recorded for later review; no redesign in Phase 2.

### 3.7 `task_demonstrations`

| Column | Type |
| --- | --- |
| id | uuid pk |
| user_id, task_id, work_order_id | uuid |
| status | enum: not_started / evidence_submitted / under_review / needs_revision / demonstrated / not_demonstrated |
| demonstrated_at, reviewed_by, review_completed_at | |
| computed_note | jsonb (which requirements satisfied by which associations) |

Unique: (`user_id`, `task_id`).

A task becomes `demonstrated` only when **all three** hold: every required Evidence
Requirement is independently satisfied by accepted associations; every gating Assessment
Criterion is met; the required human review has occurred.

### 3.8 `skill_signals`

Evidence-supported information about demonstrated capability. Not a credential.

| Column | Type |
| --- | --- |
| id | uuid pk |
| user_id, skill_key | |
| task_demonstration_id, task_skill_mapping_id | uuid |
| evidence_basis | enum |
| signal_strength_scheme | text (e.g. `v1_three_band`) |
| signal_strength_value | text |
| confidence | numeric 0–1 |
| provenance | jsonb |
| observed_at, is_superseded | |

Provenance always traces back: Skill Signal → Task Demonstration → Assessment Results →
Evidence Requirements → Evidence Artifacts → Academy Task → Academy Work Order →
`simulation_activity_id` where applicable.

### 3.9 `skill_verifications`

| Column | Type |
| --- | --- |
| id | uuid pk |
| user_id, skill_key | |
| verified_by | uuid (a person) |
| verification_policy_ref | text |
| basis_signal_ids | uuid[] |
| verified_at, expires_at, revoked_at, revocation_reason, notes | |

**No trigger, function or scheduled job may insert here.** There is no automatic path from
a Skill Signal to a Skill Verification, and no connection to credential issuance in this
phase.

---

## 4. Lifecycles

**Evidence Artifact:** `draft → submitted → under_review → accepted | rejected | needs_revision`.
A revised upload creates a *new* artifact and sets `superseded_by_artifact_id` on the old
one; nothing is overwritten. One artifact may be accepted for one requirement and rejected
for another — those are association-level outcomes, not artifact-level ones.

**Task Demonstration:** `not_started → evidence_submitted → under_review → needs_revision ⇄ under_review → demonstrated | not_demonstrated`.
Recomputed whenever an association or assessment result changes, but only a human review
completion can move it to `demonstrated`.

---

## 5. Evidence basis, quality and strength (recommendation)

Three separate concepts, deliberately not merged:

| Concept | Where it lives | Meaning |
| --- | --- | --- |
| Evidence **type** | `evidence_type` on the requirement | the artifact's form: screenshot, video_clip, before_after_pair, written_annotation, structured_form, document |
| Evidence **basis** | `evidence_basis` | what the evidence can epistemically support: outcome_capture, process_capture, written_reasoning, structured_result, human_observation, telemetry |
| Evidence **quality** | `assessment_results.evidence_quality` | how good this particular artifact is: insufficient / adequate / strong |
| Signal **strength / confidence** | `skill_signals` | how strongly the accumulated evidence supports the skill claim |

`telemetry` is defined as a basis now; no telemetry ingestion is built.

Recommendation on strength: do **not** hard-code weak/moderate/strong as the only possible
representation. Store a versioned scheme — `signal_strength_scheme` (text) +
`signal_strength_value` (text) + `confidence` (numeric 0–1) — backed by a small
`signal_strength_schemes` reference table. Scheme `v1_three_band` derives strength from
basis plus quality, capped by the mapping's `max_signal_strength`. Under v1, outcome-only
capture can never produce the top band. When the model is tested against real reviews the
scheme can be revised without a migration or loss of historical meaning.

---

## 6. Migration strategy (additive, nothing dropped)

1. Create the new tables. `work_orders.evidence_requirements` is left untouched and still read.
2. Backfill one derived requirement per existing task from the blob, marked
   `provenance = 'derived_from_legacy_blob'`, carrying **no** assessment criteria — so no
   legacy Work Order can reach `demonstrated` until an admin authors criteria.
3. Readers prefer per-task requirements when present, else fall back to the blob.
4. Import historical `work_order_evidence` rows as `evidence_artifacts` with
   `status = 'accepted'` where already approved, associated to the derived requirement,
   marked `is_legacy = true`. Legacy artifacts never generate Skill Signals. Existing
   completions, XP and credentials are unaffected.
5. Author the ATS prototype natively with real per-task requirements and criteria.

---

## 7. ATS Golden Path worked example — Trailer Positioning and Dock Approach

```text
GG Challenge  f969023f-d69e-4323-a508-778c6a92e7fa
   └─ Canonical Simulation Activity  b6e90c9b-0c62-4232-ab04-a92064af191b
        └─ Academy Work Order (to be authored; carries simulation_activity_id)
             └─ Tasks → Task Skill Mappings → Evidence Requirements
                  → Artifacts → Assessment Criteria → Human Assessment
                  → Task Demonstration → Skill Signals
```

| # | Task | Skill mapping | Evidence requirement | Gating criteria (*) |
| --- | --- | --- | --- | --- |
| 1 | Straight-line reverse, centered | `backing_maneuvers` primary, cap moderate, outcome_capture | `final_position_shot` (screenshot) | trailer centered within bay markings* |
| 2 | Offset backing | `backing_maneuvers` primary | `offset_final_shot` (screenshot) | trailer fully inside target box*; no contact with adjacent obstacle* |
| 3 | 90-degree alley dock | `docking` primary | `alley_dock_shot` (screenshot) | squared to dock face*; within dock tolerance |
| 4 | Mirror discipline | `defensive_driving` primary, `backing_maneuvers` supporting, process_capture, cap strong | `mirror_discipline_clip` (video_clip, min 30s) | mirror checks visible before each correction*; drift corrected early; continuous unedited take* |
| 5 | Setup and rationale | `docking` primary, `route_planning` supporting, before_after_pair + written_reasoning | `setup_pair` (before_after_pair) and `setup_rationale` (written_annotation) | setup angle visible in before frame*; annotation explains why that setup was chosen*; annotation names a stop condition |

All four ATS skill keys already exist in the taxonomy — no new keys required.

How the M:N model behaves here: the learner submits **one** continuous clip and associates
it with both `mirror_discipline_clip` and `alley_dock_shot`. Each association is assessed
separately against that requirement's own criteria. The reviewer may accept it for mirror
discipline and reject it for the alley dock — in which case task 4 can be demonstrated and
task 3 cannot, without any duplicate upload.

Written annotations are stored as real structured text in `body_text` / `body_structured`,
never as screenshots of text, and are assessed against explicit criteria with outcomes
met / partially_met / not_met by a human reviewer.

Signals flow only through approved mappings. No Skill Verification is produced and no
credential is issued by this flow.
