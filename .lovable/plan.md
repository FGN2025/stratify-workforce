# Phase 1B checkpoint decision, trench comparison, and proposed Phase 2 model

Three parts: (1) the MSFS approval, (2) the required comparison of the two trench
Work Orders plus the three GG-only activities, (3) the proposed Phase 2 data model
returned for approval. No Evidence + Skills Engine is built in this plan.

---

## Part 1 — Approve the MSFS mapping only

Approve the single clean mapping through the Activity Mapping Console's approve
path, which writes the identity column and nothing else:

- Preflight Aircraft Inspection `b12e6fe2-…` → Work Order `eff75523-…`
  ("MSFS Flight: Preflight Walkaround", public, active)

No other canonical ID is written. The 52 NEEDS REVIEW rows stay untouched.

Also adopt your architectural rule in the tooling, since the console currently
treats a shared canonical ID as an error:

- `simulation_activity_reconciliation` gets a status value for a shared-activity
  mapping that has been reviewed and accepted, so an accepted multi-interpretation
  set stops resurfacing in the review queue.
- The reconciliation run keeps reporting `duplicate_canonical_mappings` as an
  observation, but stops forcing those rows to NEEDS REVIEW on that basis alone.
  A row goes to NEEDS REVIEW only for unresolved identity evidence.
- The console gains a grouped view: one canonical activity showing all Academy
  Work Orders that interpret it, with an explicit "accept as multiple
  interpretations" action.

---

## Part 2 — Findings to report (already gathered, no code needed)

### Excavation and Trenching — the two Work Orders compared

| question | finding |
|---|---|
| Same underlying GG activity? | **Yes.** Both carry `fgn_origin_challenge_id` = `02481a75-…`, the CS Fiber Underground Utility Trench Excavation challenge. Not a titles match — a source-ID match. |
| Learning objectives differ? | **No.** Same title on both. The Fiber row has an empty description; the Construction row carries the GG description, which is itself fiber-framed ("suitable for conduit bedding", "first challenge in the fiber optics construction track"). |
| Tasks / rubrics differ? | **No.** Five tasks each, identical titles, byte-identical descriptions, identical `source_task_id` on all five, identical `success_criteria` (`min_score: 80`, `max_damage: 5`), same difficulty, duration and XP. |
| Evidence requirements differ? | **No.** Both use the same generic bucket: 1–5 uploads, image/video/document, required, no instructions. |
| Either claims activity the GG challenge does not contain? | **No.** Every task on both rows resolves to a real GG task ID. Neither over-claims. |

**Classification: ACTUAL IDENTITY CONFLICT — duplicate record, not differentiated interpretation.**

This is not a conflict of canonical identity (both rightly point at the same
activity) and it is not a case for minting a second Simulation Activity. It is a
conflict at the Work Order layer: two identical rows, both public and active,
differing only in `game_title` (`Fiber_Tech` vs `Construction_Sim`) and in which
source ID landed in `source_challenge_id`. A learner can complete the same work
twice and accrue evidence twice.

Your rule is satisfied the moment the two differ educationally. The report will
recommend one of two resolutions for your decision, and take neither
automatically:

- **Differentiate** — keep both, give the Construction row a civil-operations
  objective and the Fiber row a conduit-readiness objective, with distinct
  evidence emphasis. Then both hold the canonical ID as a valid multiple
  interpretation.
- **Retire one** — mark the redundant row RETIRED, keep its provenance, and let
  the surviving row hold the canonical ID.

Note the same duplication pattern exists on Conduit Placement and Backfill
(`1c899b1a-…`) and will surface as soon as GG publishes a canonical activity
for it.

### The three GG-only activities

Each reported as **GG ONLY — ACADEMY WORK ORDER NOT YET AUTHORED**. No Work
Order is created. Catalog parity is not treated as a goal. Recommendation per
activity, based on what the GG tasks can actually evidence:

- **Interior Surface Preparation and Painting** (House Flipper 2) — *recommend
  authoring*. Its annotation task demands a square-footage and gallons
  calculation at 350 sq ft per gallon, sheen and primer reasoning, and latex
  versus alkyd selection. That is genuine quantity take-off and material
  selection with real transfer, and it is the strongest assessable content in
  the Golden Path set. Do not attach it to the existing `House_Flipper`
  painting Work Order — different edition, different challenge.
- **Trailer Positioning and Dock Approach** (American Truck Simulator) —
  *recommend authoring*. Alone among the five it already demands process
  evidence: a 30–60 second mirror-discipline clip and a setup-versus-final
  position pair. It is the best available template for evidence design in
  Phase 2.
- **Bulk Grain Hauling** (Farm Simulator 2025) — *recommend deferring*. All four
  tasks prove end states (contract accepted, arrived, unloaded). Little
  assessable reasoning until per-task evidence and rubrics exist in Phase 2.

### Deliverables

Existing docs are updated in place, not duplicated:
`docs/golden-paths-reconciliation.md` (trench entry reclassified with the
comparison table and the shared-activity rule recorded),
`docs/phase-1b-checkpoint-summary.md` (checkpoint decision, MSFS approved, the
three GG-only recommendations).

---

## Part 3 — Proposed Phase 2 data model (for approval, not built)

The chain, with the layer boundary the model must never let collapse:

```text
Work Order            what Academy teaches
  └─ Task             one demonstrable action
      └─ Evidence Requirement    what must be produced for THIS task
          └─ Evidence Artifact   what the learner actually submitted
Assessment Criterion  how an artifact is judged  (attaches to a requirement)
  └─ Assessment Result  a judgement of one artifact against one criterion
      └─ Skill Signal   an inference, with a strength, never a verdict
```

### The problem it solves

Today `evidence_requirements` is one JSON blob on the Work Order. A five-task
Work Order is satisfied by one screenshot. The fix is structural: evidence
requirements move **off** the Work Order and **onto** the task, and an artifact
is bound to exactly one requirement. Task completion is then computable — a task
is demonstrated only when every required requirement under it has an accepted
artifact. No single artifact can ever satisfy two tasks.

### Proposed tables

- `work_order_task_evidence_requirements` — per task: `kind`
  (`screenshot` | `video_clip` | `before_after_pair` | `written_annotation` |
  `document`), `instructions`, `min_artifacts`, `max_artifacts`, `is_required`,
  `min_duration_seconds` (for clips), `order_index`. Replaces the Work Order
  blob; the existing blob stays readable during migration so nothing breaks.
- `evidence_artifacts` — one submission bound to one requirement and one user:
  storage path or text body, `mime_type`, `duration_seconds`, `submitted_at`,
  `status` (`submitted` | `accepted` | `rejected` | `needs_revision`).
  **Written annotations are first-class here** — an annotation is stored as text,
  not as a photo of text, so it can be read and reviewed.
- `assessment_criteria` — attached to a requirement: `criterion_text`,
  `guidance_for_reviewer`, `weight`, `is_gating`. This is the rubric the current
  system lacks entirely. A trade annotation gets explicit criteria such as
  "states the setback distance and why surcharge load matters".
- `assessment_results` — one artifact judged against one criterion by one
  reviewer: `outcome` (`met` | `partially_met` | `not_met`), `reviewer_id`,
  `reviewer_note`, `reviewed_at`. Human review only in Phase 2.
- `task_demonstrations` — derived per user per task: `status`, `demonstrated_at`,
  computed from requirement coverage plus gating criteria. This is the
  "task demonstrated" layer, distinct from artifacts existing.
- `skill_signals` — per user: `skill_key`, `source_task_demonstration_id`,
  `strength` (`weak` | `moderate` | `strong`), `evidence_basis`
  (`outcome_capture` | `process_capture` | `written_reasoning`), `observed_at`.
  A signal is an inference from one demonstration. It is **never** a verification.
- `skill_verifications` — a separate, deliberately sparse table requiring an
  explicit verifier and a policy reference. Nothing writes to it automatically.

### How the four distinctions stay separate

| distinction | enforced by |
|---|---|
| Evidence collected | a row in `evidence_artifacts` — existence only, proves nothing |
| ≠ Task demonstrated | `task_demonstrations`, requires every required requirement satisfied and every gating criterion met |
| ≠ Skill demonstrated | `skill_signals`, an inference carrying a strength and an evidence basis, never a pass |
| ≠ Skill verified | `skill_verifications`, a separate table with a human verifier and a policy reference; no automatic path writes it |

No layer promotes itself. Completion in a simulator never becomes a skill claim
without a human crossing each boundary explicitly.

### Explicitly out of scope in Phase 2

No AI scoring, no telemetry ingestion, no new credential types, no changes to
the Skills Taxonomy, no retroactive XP or badges, no learner UI redesign.
`success_criteria` recalibration per activity is noted as a follow-on, not done here.

### Migration posture

Additive only. Existing `evidence_requirements` blobs are read during a
transition; nothing is deleted. Work Orders without per-task requirements keep
behaving exactly as they do today.

---

## Order of work if approved

1. Approve the MSFS mapping (one identity column write).
2. Reconciliation and console updates so shared canonical activities are a
   supported resolved state, not a flagged error.
3. Update the two docs with the comparison and the GG-only recommendations.
4. Phase 2 model returns here for your approval before any table is created.

Nothing in steps 1–3 writes a canonical ID to any Work Order other than the MSFS
one, and no broad migration is performed.
