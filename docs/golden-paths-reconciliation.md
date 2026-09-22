# Golden Path reconciliation — canonical Simulation Activity identity

Phase 1B. All FGN.GG values below were retrieved from the **live** ecosystem API
on 2026-09-22 (`simulation-activities`, `simulation-activity`, `challenges`).
No name was invented, no id was inferred from titles, and no Work Order was
modified while producing this report.

Academy figures come from the reconciliation run stored in
`simulation_activity_reconciliation` (proposals only).

Run summary across the whole catalog: 57 Work Orders examined, 5 canonical
activities cached, 1 MATCHED, 4 LEGACY SOURCE, 52 NEEDS REVIEW. The large
NEEDS REVIEW count is almost entirely one reason: the GG challenge exists and
resolves deterministically, but FGN.GG has not yet published a canonical
activity for it (`review_reason = canonical_identity_not_yet_published_by_gg`).
That is a coverage state on the GG side, not an Academy data fault.

---

## 1. Bulk Grain Hauling — Farm Simulator 2025

**Identity alignment**

| question | answer |
|---|---|
| Canonical activity | Bulk Grain Hauling |
| simulation_activity_id | `6ac1275d-6c8d-41c0-ad52-9f22bd13ea2e` |
| GG challenge | FS25 CDL: Bulk Grain Haul |
| GG challenge_id | `7ceee2be-1279-45a1-97eb-618db5d403d7` |
| Academy source ids | none |
| Academy work_order_id | none |
| Resolution check | Not resolvable — no Academy Work Order references this challenge |
| Game edition (GG) | Farm Simulator 2025, `game_version` = "2025" |
| Game edition (Academy) | Academy uses `game_title = Farming_Sim` with no version field |
| Discrepancy | Canonical activity exists on GG with no Academy counterpart |

**Learning alignment** — no Academy learning objective, tasks, evidence
requirements, assessment, course/lesson placement or credential exist for this
activity. Academy's two Farming_Sim Work Orders (`FS25 - Bronze Challenge`,
`FS25 Precision Ag: Harvest Operations and Yield Mapping`) map to different GG
challenges and must not be repurposed to absorb this identity.

Status: **ORPHANED on the Academy side** (canonical activity without a Work
Order). Recorded in the run output as
`canonical_activities_without_work_order`, not as a Work Order exception.

---

## 2. Excavation and Trenching — Construction Simulator

**Identity alignment**

| question | answer |
|---|---|
| Canonical activity | Excavation and Trenching |
| simulation_activity_id | `086eefb4-bff0-4826-8543-22864689cd2e` |
| GG challenge | CS Fiber: Underground Utility Trench Excavation |
| GG challenge_id | `02481a75-383c-485a-bdff-f0a4dd2b9121` |
| Academy work_order_id | **TWO**: `f4347636-5f14-45df-a59e-155abec8262d` (game_title `Fiber_Tech`) and `f98c218c-2c64-4fde-a1c4-cdfada0658b6` (game_title `Construction_Sim`) |
| Academy source ids (Fiber_Tech row) | `source_challenge_id` = `02481a75-…` (same as origin), `fgn_origin_challenge_id` = `02481a75-…` |
| Academy source ids (Construction_Sim row) | `source_challenge_id` = `64d00db6-3c3a-4c69-ae2f-d83c1b0216d8`, `fgn_origin_challenge_id` = `02481a75-…` |
| Resolution check | Deterministic on `fgn_origin_challenge_id` for both rows — and that is the problem |
| Game edition | GG: Construction Simulator, `game_version` = null. Academy: two different `game_title` values for one game |
| Discrepancy | **Duplicate canonical claim.** One canonical activity, two active Academy Work Orders |

Both rows are held at **NEEDS REVIEW** with
`duplicate_canonical_mapping = true`. Neither was written. A human must decide
whether the Fiber_Tech row and the Construction_Sim row are one learning
experience presented in two industry contexts (in which case one of them should
hold the canonical id, or Academy needs an explicit "same activity, different
industry framing" rule) or genuinely separate experiences.

Note: the identical duplication pattern exists for
`CS Fiber: Conduit Placement and Backfill` (`1c899b1a-…`), which has both a
`Fiber_Tech` and a `Construction_Sim` Work Order. That challenge has no
canonical activity published yet, so it has not surfaced as a duplicate yet —
it will the moment GG publishes one.

**Learning alignment (both rows)**

| aspect | value |
|---|---|
| Learning objective | Not stored as a distinct field; carried in the description inherited from GG |
| Tasks | 4 Academy tasks, each carrying `source_task_id` pointing at the GG task — 1:1 with the GG challenge tasks |
| Skills / tags | None on the Work Order — Academy has no skill tag field on `work_orders` |
| Evidence requirements | 1–5 uploads, image/video/document, required, no instructions text |
| Assessment / review | `success_criteria` = `{ min_score: 80, max_damage: 5 }`; evidence review is the human path |
| Course / lesson relationship | **None** — neither row is referenced by any lesson |
| Credential relationship | None specific; only the two generic credential types (`play_achievement`, `play_evidence`) exist platform-wide |

---

## 3. Interior Surface Preparation and Painting — House Flipper 2

**Identity alignment**

| question | answer |
|---|---|
| Canonical activity | Interior Surface Preparation and Painting |
| simulation_activity_id | `19720a68-04bd-4dae-8f74-17e91d14d4b5` |
| GG challenge | HF2 Skills: Paint System Selection and Room Coverage |
| GG challenge_id | `c79a46d4-9aa6-43b2-914f-1f83419f2586` |
| Academy source ids | none |
| Academy work_order_id | none |
| Resolution check | Not resolvable — no Academy Work Order references this challenge |
| Game edition | GG: House Flipper 2, `game_version` = "2". Academy distinguishes `House_Flipper` from `House_Flipper_2` but stores no version |
| Discrepancy | Canonical activity with no Academy counterpart. Academy has a similarly themed but different Work Order, `Load Out for a Paint and Patch Day` (game_title `House_Flipper`, challenge `ac805af3-…`) — **do not** attach this canonical id to it; different game edition, different challenge, different activity |

**Learning alignment** — none exists on the Academy side.

---

## 4. Preflight Aircraft Inspection — Microsoft Flight Simulator 2024

**Identity alignment**

| question | answer |
|---|---|
| Canonical activity | Preflight Aircraft Inspection |
| simulation_activity_id | `b12e6fe2-1758-4409-84ff-762cc66323f4` |
| GG challenge | MSFS Flight: Preflight Walkaround |
| GG challenge_id | `7846317c-77b2-4dd4-a855-308cb659891a` |
| Academy source ids | `fgn_origin_challenge_id` = `7846317c-…`, `source_challenge_id` = `2d523d5a-76d8-43b2-9176-48ff1b8c0b8b` (Academy-side id, retained as provenance) |
| Academy work_order_id | `eff75523-423a-4005-9af2-1d9d1d80e8f0` |
| Resolution check | Deterministic, single, unambiguous |
| Game edition | GG: Microsoft Flight Simulator 2024, `game_version` = "2024". Academy: `game_title = MSFS_2024` |
| Discrepancy | None on identity |

Status: **MATCHED**, awaiting admin approval before the id is written.

**Learning alignment**

| aspect | value |
|---|---|
| Learning objective | Not a distinct field; inherited from the GG challenge description |
| Tasks | 4 Academy tasks, text identical to the GG tasks, but `source_task_id` is **null** on all four — task-level provenance was not captured on this import |
| Skills / tags | None on the Work Order |
| Evidence requirements | 1–5 uploads, image/video/document, required |
| Assessment / review | `success_criteria` = `{ min_score: 80, max_damage: 5 }`; XP 20, difficulty beginner, 60 minutes |
| Course / lesson relationship | Referenced by lesson "Cockpit Flow, Before Takeoff" in course "MSFS 2024 — Simulation Stubs" |
| Credential relationship | No dedicated credential type |

---

## 5. Trailer Positioning and Dock Approach — American Truck Simulator

**Identity alignment**

| question | answer |
|---|---|
| Canonical activity | Trailer Positioning and Dock Approach |
| simulation_activity_id | `b6e90c9b-0c62-4232-ab04-a92064af191b` |
| GG challenge | ATS Skills: Precision Backing and Dock |
| GG challenge_id | `f969023f-d69e-4323-a508-778c6a92e7fa` |
| Academy source ids | none |
| Academy work_order_id | none |
| Resolution check | Not resolvable — no Academy Work Order references this challenge |
| Game edition | GG: American Truck Simulator, `game_version` = null. Academy: `game_title = ATS` |
| Discrepancy | Canonical activity with no Academy counterpart. Academy has four ATS Work Orders including `ATS Skills: Speed Management` (`40733510-…`) — a sibling challenge in the same series, **not** this activity |

**Learning alignment** — none exists on the Academy side.

---

## Cross-path observations

1. **Coverage is the headline issue, not conflict.** Three of five canonical
   activities have no Academy Work Order at all. Only one path (MSFS) is clean.
2. **One real identity conflict**: two Academy Work Orders claim Excavation and
   Trenching, caused by Academy's practice of duplicating a Construction
   Simulator challenge under both a `Construction_Sim` and a `Fiber_Tech`
   framing. This pattern repeats on Conduit Placement and Backfill and will
   produce more duplicates as GG publishes more canonical activities.
3. **Task provenance is inconsistent.** The trench Work Orders carry
   `source_task_id` on every task; the MSFS Work Order carries none. Task-level
   canonical alignment is therefore only partially possible today.
4. **Game edition is asymmetric.** GG carries `game_version` (sometimes null);
   Academy carries only a `game_title` enum with edition baked into the name
   (`House_Flipper` vs `House_Flipper_2`, `MSFS_2024`). No reliable programmatic
   comparison is possible; edition must be confirmed per activity by a human.
5. **No Academy Work Order stores skill tags.** Any skill claim today is
   implicit in descriptions, not structured data.
6. **No canonical id has been written anywhere.** Every row above is a proposal.

---

## Checkpoint decisions applied (2026-09-22)

These decisions were taken at the Phase 1B checkpoint and are now reflected in the data.

### 1. MSFS Preflight Aircraft Inspection — APPROVED

| Field | Value |
| --- | --- |
| Canonical Simulation Activity | `b12e6fe2-1758-4409-84ff-762cc66323f4` (Preflight Aircraft Inspection) |
| Academy Work Order | `eff75523-423a-4005-9af2-1d9d1d80e8f0` — "MSFS Flight: Preflight Walkaround" |
| Reconciliation status | `MATCHED`, resolved |

Only the identity column `work_orders.simulation_activity_id` was written. No educational
content, source identifier or metadata was touched. No other Work Order received a
canonical id — broad migration remains deliberately withheld.

### 2. Excavation and Trenching — remains in review

Architectural rule of record:

> One canonical Simulation Activity MAY support multiple Academy Work Orders, but only
> when those Work Orders represent materially different educational interpretations.
> `simulation_activity_id` identifies what occurred in the simulation.
> `work_order_id` identifies the educational interpretation of that activity.

The two trench Work Orders are byte-identical in tasks, success criteria, difficulty,
duration, XP and evidence requirements. They are therefore a **duplicate educational
record**, not yet a valid multiple interpretation.

| Work Order | Game title | Disposition |
| --- | --- | --- |
| `f4347636-5f14-45df-a59e-155abec8262d` | Fiber_Tech | `NEEDS_REVIEW` — shared canonical activity pending interpretation review |
| `f98c218c-2c64-4fde-a1c4-cdfada0658b6` | Construction_Sim | `NEEDS_REVIEW` — shared canonical activity pending interpretation review |

No new Simulation Activity was minted. Neither Work Order was retired. No educational
rewrite was performed. The intent to later differentiate these into a Construction
interpretation and a Fiber construction interpretation — with different learning
objectives, task emphasis, evidence requirements and assessment criteria — is recorded
here as future work, not Phase 1B work.

### 3. Conduit Placement and Backfill — duplication preserved

`e008fe88-5a8f-4fd6-ad62-df779717c36d` and `fbc3b71e-e904-437f-af80-9910d8a9ebbd`
("CS Fiber: Conduit Placement and Backfill") share one GG challenge that FGN.GG has not
yet given a canonical activity. Both are recorded as `NEEDS_REVIEW` with the diagnostic
`shared_source_challenge` and reason `shared_gg_challenge_awaiting_canonical_identity`,
so the pairing resurfaces the moment a canonical activity is published for it.

### 4. Console behaviour

- New resolved status `ACCEPTED_MULTI_INTERPRETATION`. Once an admin accepts a shared
  activity set, it stops resurfacing in the review queue.
- A shared canonical activity is reported as an **observation**, not an automatic error.
  It only carries `NEEDS_REVIEW` while the interpretations remain undifferentiated.
- A grouped view shows one canonical activity together with every Work Order that
  interprets it, with a single explicit accept action for the set.

### 5. GG-only Golden Paths — no Work Orders created

| Canonical activity | Game | Disposition |
| --- | --- | --- |
| Interior Surface Preparation and Painting (`19720a68-04bd-4dae-8f74-17e91d14d4b5`) | House Flipper 2 | GG ONLY — ACADEMY WORK ORDER NOT YET AUTHORED. Authoring candidate: quantity take-off and material selection reasoning are genuinely assessable. |
| Trailer Positioning and Dock Approach (`b6e90c9b-0c62-4232-ab04-a92064af191b`) | American Truck Simulator | GG ONLY — ACADEMY WORK ORDER NOT YET AUTHORED. Authoring candidate and preferred first Phase 2 evidence prototype: the only path requiring process evidence. |
| Bulk Grain Hauling (`6ac1275d-6c8d-41c0-ad52-9f22bd13ea2e`) | Farm Simulator 2025 | GG ONLY — ACADEMY WORK ORDER NOT YET AUTHORED. Deferred until the Evidence + Skills model exists. |

Catalog parity between FGN.GG and the Academy is explicitly **not** a requirement.
