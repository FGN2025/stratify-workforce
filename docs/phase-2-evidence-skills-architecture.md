# Phase 2 — Evidence + Skills Architecture (final build spec, not implemented)

Status: **BUILT (Phase 2A).** The schema, review engine and ATS prototype described here are
live. See `docs/phase-2a-build-report.md` for what was actually created, the deltas made
during implementation, and the acceptance and security test results.


Out of scope, unchanged: AI scoring, telemetry ingestion, automatic Skill Verification, new
credential types or issuance, Skills Taxonomy redesign, retroactive skill claims, retroactive
XP or badges, learner UI redesign, bulk catalog migration, recalibration of existing
`success_criteria`.

Four distinctions remain permanently separate:

```text
Evidence collected  ≠  Task demonstrated  ≠  Skill signal  ≠  Skill verified
```

---

## 1. Entity model

```text
User
 └─ Work Order Attempt  (user_work_order_completions — EXISTING, authoritative)
      └─ Work Order
           └─ Task  (work_order_tasks — existing)
                ├─ Task Skill Mapping ──► skills_taxonomy (explicit, human approved)
                └─ Evidence Requirement
                      ├─ accepted_evidence_types[]  (several artifact forms allowed)
                      ├─ Assessment Criterion  (some gating)
                      └─ ◄─ Evidence Artifact Requirement (M:N, carries locator
                             + association lifecycle) ─► Evidence Artifact
                                   └─ Assessment Result (per criterion, per association)
      └─ Task Demonstration  (per user, per task, PER ATTEMPT)
           └─ Skill Signal
                 └─ (human only) Skill Verification ─► skill_verification_signals
```

### Attempt model

Academy already has an authoritative attempt entity: `user_work_order_completions`
(`id`, `user_id`, `work_order_id`, `status`, `score`, `attempt_number`, `started_at`,
`completed_at`). **No parallel attempt model is created.** `work_order_evidence` already
references it via `completion_id`; Phase 2 keeps that convention and names the column
`completion_id` (the Work Order attempt).

Failed or incomplete attempts are never overwritten: demonstrations and artifacts are
attempt-scoped rows, so earlier attempts remain historically visible after a later success.

---

## 2. Tables

### 2.1 `work_order_task_evidence_requirements`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid → work_order_tasks(id) on delete cascade | |
| requirement_key | text | unique per task |
| label, instructions | text | learner-facing |
| accepted_evidence_types | `evidence_type[]` not null | ≥1; a requirement may be satisfied by any listed form |
| evidence_basis | `evidence_basis` | epistemic basis, independent of artifact form |
| min_artifacts / max_artifacts | int | default 1 / 1 |
| is_required | boolean default true | |
| min_duration_seconds | int null | video only |
| requires_pair | boolean default false | before/after |
| order_index | int | |
| provenance | text | `authored` \| `derived_from_legacy_blob` |
| is_active | boolean default true | |
| created_at / updated_at | timestamptz | |

Unique: (`task_id`, `requirement_key`). Index: (`task_id`, `order_index`).

### 2.2 `evidence_artifacts`

A thing the learner produced. Not tied to a requirement. **Lifecycle status only.**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid not null | |
| work_order_id | uuid → work_orders | |
| completion_id | uuid → user_work_order_completions null | the attempt; null only for legacy imports |
| artifact_kind | text | `file` \| `text` |
| storage_path | text null | private `evidence` bucket, signed-URL reads |
| mime_type, duration_seconds, file_size | | |
| body_text | text null | written annotations as real text |
| body_structured | jsonb null | structured form answers |
| title, captured_at, submitted_at | | |
| status | `artifact_status` | `draft` \| `submitted` \| `under_review` \| `superseded` \| `withdrawn` |
| superseded_by_artifact_id | uuid → evidence_artifacts null | revision chain |
| is_legacy | boolean default false | |
| legacy_evidence_id | uuid → work_order_evidence null | provenance for migrated rows |
| created_at / updated_at | | |

**`accepted` / `rejected` / `needs_revision` do not exist at artifact level.** Indexes:
(`user_id`, `work_order_id`), (`completion_id`).

### 2.3 `evidence_artifact_requirements` (M:N + assessment state + locator)

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| artifact_id | uuid → evidence_artifacts on delete cascade | |
| requirement_id | uuid → work_order_task_evidence_requirements | |
| completion_id | uuid → user_work_order_completions null | attempt the claim belongs to |
| association_status | `association_status` | `claimed` \| `under_review` \| `accepted` \| `rejected` \| `needs_revision` |
| learner_rationale | text null | |
| timecode_start_seconds / timecode_end_seconds | numeric null | "demonstrated at 00:42–00:58" |
| page_number | int null | documents |
| frame_reference | text null | named frame / still |
| reviewed_by, reviewed_at | | |
| is_active | boolean default true | superseded claims set false |
| created_at / updated_at | | |

Unique: (`artifact_id`, `requirement_id`, `completion_id`).
Indexes: (`requirement_id`, `association_status`), (`completion_id`).

**Governing rule.** Every required Evidence Requirement must be **independently satisfied**.
One artifact may serve several requirements only when explicitly associated with each; each
association carries its own criteria, locator and decision. Acceptance for one requirement
never implies acceptance for another, and the same file is never uploaded twice merely to
satisfy the data model.

### 2.4 `assessment_criteria`

| Column | Type |
| --- | --- |
| id | uuid pk |
| requirement_id | uuid → work_order_task_evidence_requirements |
| criterion_key, criterion_text, guidance_for_reviewer | text |
| weight | numeric default 1 |
| is_gating | boolean default false |
| order_index, is_active, created_at, updated_at | |

Unique: (`requirement_id`, `criterion_key`).

### 2.5 `assessment_results`

| Column | Type |
| --- | --- |
| id | uuid pk |
| artifact_requirement_id | uuid → evidence_artifact_requirements on delete cascade |
| criterion_id | uuid → assessment_criteria |
| outcome | `assessment_outcome`: met / partially_met / not_met |
| evidence_quality | `evidence_quality`: insufficient / adequate / strong |
| reviewer_id, reviewer_note, reviewed_at | |

Unique: (`artifact_requirement_id`, `criterion_id`, `reviewer_id`). Human review only.

### 2.6 `task_skill_mappings`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid → work_order_tasks | |
| skill_key | text → skills_taxonomy | existing keys used where they exist |
| relationship | `skill_relationship`: primary / supporting / prerequisite_context | |
| expected_evidence_basis | `evidence_basis[]` | |
| max_signal_strength | text | cap; outcome-only capture can never reach the top band |
| rationale | text | |
| mapping_version | int default 1 | |
| is_active | boolean | |
| approved_by, approved_at | | **effective only when approved_by is set** |

Unique: (`task_id`, `skill_key`, `mapping_version`). Never inferred from titles, never AI-generated.

Taxonomy note: no duplicate keys today, but entries are game-scoped via `game_title`, so
cross-industry skills will fragment. Recorded for later review; no redesign in Phase 2.

### 2.7 `task_demonstrations` (attempt-aware)

| Column | Type |
| --- | --- |
| id | uuid pk |
| user_id, task_id, work_order_id | uuid |
| completion_id | uuid → user_work_order_completions **not null** |
| status | `demonstration_status`: not_started / evidence_submitted / under_review / needs_revision / demonstrated / not_demonstrated |
| demonstrated_at, reviewed_by, review_completed_at | |
| computed_note | jsonb (which requirements satisfied by which associations) |

Unique: (`user_id`, `task_id`, `completion_id`). Index: (`completion_id`, `status`).

### 2.8 `skill_signals`

| Column | Type |
| --- | --- |
| id | uuid pk |
| user_id, skill_key | |
| task_demonstration_id → task_demonstrations | uuid |
| task_skill_mapping_id → task_skill_mappings | uuid |
| completion_id | uuid (denormalized attempt reference) |
| evidence_basis | enum |
| signal_strength_scheme, signal_strength_value | text |
| confidence | numeric 0–1 |
| provenance | jsonb |
| observed_at, is_superseded | |

Unique: (`task_demonstration_id`, `task_skill_mapping_id`).

Provenance always traces: Skill Signal → Task Demonstration → Assessment Results →
Evidence Requirements → Evidence Artifacts → Academy Task → Academy Work Order →
`simulation_activity_id` where applicable.

### 2.9 `skill_verifications`

| Column | Type |
| --- | --- |
| id | uuid pk |
| user_id, skill_key | |
| verified_by | uuid (a person) |
| verification_policy_ref | text |
| verified_at, expires_at, revoked_at, revocation_reason, notes | |

No `basis_signal_ids` array.

### 2.10 `skill_verification_signals` (junction)

| Column | Type |
| --- | --- |
| id | uuid pk |
| skill_verification_id | uuid → skill_verifications on delete cascade |
| skill_signal_id | uuid → skill_signals |
| created_at | timestamptz |

Unique: (`skill_verification_id`, `skill_signal_id`).

**No trigger, function or scheduled job may insert into `skill_verifications` or this
junction.** No automatic path from Skill Signal to Skill Verification; no connection to
credential issuance in this phase.

---

## 3. Lifecycles

**Artifact (lifecycle only):** `draft → submitted → under_review → superseded | withdrawn`.
A revision creates a *new* artifact; the old one becomes `superseded` via
`superseded_by_artifact_id`. Nothing is overwritten.

**Association (assessment state):** `claimed → under_review → accepted | rejected | needs_revision`.
Per requirement. One artifact may be accepted for A, need revision for B and be rejected for C.

**Assessment:** a reviewer records one `assessment_results` row per criterion per association.
Human review only.

**Task Demonstration:** `not_started → evidence_submitted → under_review → needs_revision ⇄ under_review → demonstrated | not_demonstrated`,
scoped to one attempt. Recomputed whenever an association or assessment result on that
attempt changes; only a completed human review can move it to `demonstrated`.

---

## 4. Evidence type, basis, quality, strength

| Concept | Where | Meaning |
| --- | --- | --- |
| Evidence **type** | `accepted_evidence_types[]` on the requirement | artifact form: screenshot, video_clip, video_timecode_reference, before_after_pair, written_annotation, structured_form, document |
| Evidence **basis** | `evidence_basis` | what it can epistemically support: outcome_capture, process_capture, written_reasoning, structured_result, human_observation, telemetry |
| Evidence **quality** | `assessment_results.evidence_quality` | insufficient / adequate / strong |
| Signal **strength / confidence** | `skill_signals` | how strongly accumulated evidence supports the claim |

Type and basis are independent: `video_clip` + `process_capture`, or `screenshot` +
`outcome_capture`. `telemetry` is defined as a basis; no ingestion is built.

Strength stays versioned: `signal_strength_scheme` + `signal_strength_value` + `confidence`,
backed by a small `signal_strength_schemes` reference table. Scheme `v1_three_band` derives
strength from basis plus quality, capped by the mapping's `max_signal_strength`; outcome-only
capture can never produce the top band.

**`confidence` is an internal evidence-strength measure. It is NOT a calibrated probability
that a person possesses a real-world occupational skill and must never be presented as
statistical certainty.** No AI calculation in this phase.

---

## 5. Legacy evidence migration (two paths, nothing fabricated)

Current state: `work_order_evidence` holds **0 rows**, and none carry task provenance in
`metadata`. The rules below still bind any future import.

**Path A — deterministic task provenance present** (`metadata.task_id` /
`work_order_task_id` / matching `source_task_id`): migrate to an `evidence_artifacts` row
with `is_legacy = true`, `legacy_evidence_id`, `completion_id` copied from the source row,
and an association to the corresponding task requirement.

**Path B — no deterministic task provenance (the default):** import as an
`evidence_artifacts` row marked `is_legacy = true`, `legacy_task_attribution = 'unknown'`,
with **no** association rows. Such evidence is labelled **LEGACY WORK ORDER EVIDENCE —
TASK ATTRIBUTION UNKNOWN**. It is never attributed to every task, never mapped to an
invented requirement, never silently reinterpreted as task-level evidence. It **does not**
create a Task Demonstration and **does not** create a Skill Signal. It remains valid for the
historical Work Order completion under the rules in force at the time.

Other migration rules: new tables are additive; `work_orders.evidence_requirements` is left
untouched and still read; readers prefer per-task requirements when present and fall back to
the blob; derived legacy requirements carry **no** assessment criteria, so no legacy Work
Order can reach `demonstrated` until an admin authors criteria. Existing completions, XP,
badges and credentials are unaffected.

---

## 6. ATS worked example — Trailer Positioning and Dock Approach

```text
GG Challenge  f969023f-d69e-4323-a508-778c6a92e7fa
   └─ Canonical Simulation Activity  b6e90c9b-0c62-4232-ab04-a92064af191b
        └─ Academy Work Order (to be authored; carries simulation_activity_id)
             └─ Learner → Work Order Attempt (user_work_order_completions.id = ATT-1)
                  └─ 5 Tasks → Task Skill Mappings → Evidence Requirements
                       → Artifacts → Associations (+ locators) → Criteria
                       → Human Assessment → Task Demonstration (per attempt) → Skill Signals
```

| # | Task | Skill mapping | Requirement (accepted types) | Gating criteria (*) |
| --- | --- | --- | --- | --- |
| 1 | Straight-line reverse, centered | `backing_maneuvers` primary, cap moderate, outcome_capture | `final_position_shot` (screenshot, video_timecode_reference) | trailer centered within bay markings* |
| 2 | Offset backing | `backing_maneuvers` primary | `offset_final_shot` (screenshot, video_timecode_reference) | fully inside target box*; no contact with obstacle* |
| 3 | 90-degree alley dock | `docking` primary | `alley_dock_final_position` (screenshot, video_clip, video_timecode_reference) | squared to dock face*; within dock tolerance |
| 4 | Mirror discipline | `defensive_driving` primary, `backing_maneuvers` supporting, process_capture, cap strong | `mirror_discipline_clip` (video_clip, min 30s) | mirror checks visible before each correction*; drift corrected early; continuous unedited take* |
| 5 | Setup and rationale | `docking` primary, `route_planning` supporting | `setup_pair` (before_after_pair) and `setup_rationale` (written_annotation, structured_form) | setup angle visible in before frame*; annotation explains why that setup was chosen*; annotation names a stop condition |

All four skill keys already exist in the taxonomy; no new keys required.

### One video, two requirements, two outcomes

Attempt ATT-1. The learner submits **one** continuous clip, artifact `ART-1`
(`status = submitted`, `completion_id = ATT-1`), and claims it twice:

| Association | Requirement | Locator | Status |
| --- | --- | --- | --- |
| `AR-1` | `mirror_discipline_clip` (task 4) | 00:00–02:30 | **accepted** |
| `AR-2` | `alley_dock_final_position` (task 3) | 00:42–00:58 | **needs_revision** (dock face not visible in frame) |

Each association is assessed against its own criteria and carries its own
`assessment_results`. Task 4 reaches `demonstrated` for ATT-1; task 3 stays
`needs_revision`. `ART-1` itself remains `submitted` — no artifact-level verdict exists.

### Revising without destroying the accepted assessment

The learner uploads a corrected still, artifact `ART-2`, and creates a new association
`AR-3` (`ART-2` → `alley_dock_final_position`, ATT-1, `claimed`). `AR-2` is set
`is_active = false` and remains in history with its assessment results intact. `AR-1`,
`ART-1` and the task 4 demonstration are untouched — nothing about the accepted mirror
discipline assessment is replaced or deleted. When `AR-3` is accepted and every gating
criterion for task 3 is met, task 3 becomes `demonstrated` for ATT-1.

### Attempt history

If the learner later runs ATT-2, new artifacts, associations and a **new** row in
`task_demonstrations` are created for `(user, task, ATT-2)`. The ATT-1 rows, including any
`not_demonstrated` outcome, remain queryable forever.

Signals flow only through approved mappings. No Skill Verification is produced and no
credential is issued by this flow.

---

## 7. RLS requirements

All nine (plus junction) tables: RLS enabled, explicit `GRANT`s, no `USING (true)`.

- `work_order_task_evidence_requirements`, `assessment_criteria`, `task_skill_mappings`:
  read for authenticated users who can see the parent Work Order
  (`public.is_work_order_visible(auth.uid(), work_order_id)` via the task join); write for
  platform admins and tenant admins of the owning tenant.
- `evidence_artifacts`, `evidence_artifact_requirements`: learner reads and writes own rows
  (insert/update only while `draft`/`submitted`/`claimed`); reviewers = platform admins and
  tenant admins of the Work Order's tenant read all and update review fields. Files stay in
  the private `evidence` bucket, read via signed URLs.
- `assessment_results`: insert/update restricted to reviewers; learner may read results on
  their own associations.
- `task_demonstrations`: learner reads own; reviewers read/write within their tenant. No
  client-side path may set `demonstrated`.
- `skill_signals`: learner reads own; admins read within tenant; writes service_role only.
- `skill_verifications`, `skill_verification_signals`: read by the subject and admins; insert
  restricted to a verifier role, **never** by trigger, function or job.
- `service_role` granted ALL on every table.

---

## 8. Final build spec summary

**Create (11 objects):** `work_order_task_evidence_requirements`, `evidence_artifacts`,
`evidence_artifact_requirements`, `assessment_criteria`, `assessment_results`,
`task_skill_mappings`, `task_demonstrations`, `skill_signals`, `skill_verifications`,
`skill_verification_signals`, `signal_strength_schemes`.

**Enums:** `evidence_type`, `evidence_basis`, `artifact_status`, `association_status`,
`assessment_outcome`, `evidence_quality`, `skill_relationship`, `demonstration_status`.

**Attempt relationship:** `user_work_order_completions.id` is the attempt; carried on
`evidence_artifacts.completion_id`, `evidence_artifact_requirements.completion_id`,
`task_demonstrations.completion_id` (not null), `skill_signals.completion_id`.

**Task Demonstration computation** (recompute on association/result change; human review
required to finalize): for the given `(user, task, completion)`, every `is_required`
requirement must have at least one `accepted` active association, every `is_gating`
criterion across those associations must have outcome `met`, and `review_completed_at` must
be set.

**Skill Signal creation rule:** one signal per `(task_demonstration, approved active
task_skill_mapping)` when the demonstration reaches `demonstrated`; basis from the
requirement; strength from the versioned scheme capped by `max_signal_strength`. Legacy
artifacts never generate signals.

**Skill Verification boundary:** human-only inserts, linked to signals through
`skill_verification_signals`; no automation, no credential issuance.

No tables are created until this spec is approved.
