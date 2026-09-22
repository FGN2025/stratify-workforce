# Golden Path skills and evidence findings

Phase 1B, observation only. This document reports discrepancies between what is
simulated, what is required, what is taught, what is collected and what is
claimed. **Nothing here is fixed in Phase 1B** — this is input to Phase 2
(Evidence + Skills Engine).

Layer ownership reminder: FGN.GG owns completion of the challenge. Academy owns
learning interpretation. Completion at one layer never constitutes approval at a
higher layer.

For each path: what the game does · what the GG challenge requires · what the
Academy Work Order teaches · what evidence is collected · what skill the system
claims · what the evidence can actually support.

---

## 1. Bulk Grain Hauling — Farm Simulator 2025

- **Game**: simulates loading a grain trailer from field or combine, driving a
  loaded vehicle on rural roads, and reversing to an elevator unload trigger.
- **GG challenge requires** (4 tasks): accept and load a grain contract; drive
  to the elevator without crashing; stage a deliberate back-in; unload at the
  trigger zone. Every task's proof is a screenshot or video.
- **Academy teaches**: nothing. No Work Order exists.
- **Evidence collected**: none by Academy.
- **Skill claimed**: none.
- **Evidence can actually support**: that a loaded trailer reached an unload
  trigger and the contract advanced. It cannot support smooth-load discipline,
  speed/space management, or backing technique — all four proofs are
  end-state captures, not process captures.
- **Gap**: canonical activity with zero Academy learning interpretation.

## 2. Excavation and Trenching — Construction Simulator

- **Game**: simulates excavator operation, trench geometry, Construction View
  feedback, and spoil placement.
- **GG challenge requires** (4 tasks): successive controlled passes from a
  consistent start corner; consistent trench width/depth verified in
  Construction View; spoil placed in a set-back windrow (two-foot discipline
  cited); a UUIT safety annotation naming pre-entry hazards a competent person
  must verify.
- **Academy teaches**: the same four tasks, copied verbatim, with
  `source_task_id` preserved. Academy adds difficulty intermediate, 120 minutes,
  25 XP, and `success_criteria` of min score 80 / max damage 5. Academy adds no
  learning objective, rubric or safety gate of its own.
- **Evidence collected**: 1–5 uploads (image/video/document), required, with no
  per-task instructions and no upload-to-task binding.
- **Skill claimed**: implicitly, trench excavation and trench-safety awareness —
  reinforced by the Work Order being surfaced under a `Fiber_Tech` industry
  framing.
- **Evidence can actually support**: that a trench of roughly consistent
  geometry was produced in a simulator, that spoil was visibly set back, and
  that the learner can write a plausible hazard statement. It **cannot** support
  competent-person judgement, soil classification, protective-system selection,
  or any claim transferable to a real excavation site. The min-score/max-damage
  criteria are simulator scores, not competence measures.
- **Gap**: the safety annotation is the only cognitive artifact and it is scored
  by the same generic evidence flow as a screenshot. A trench-safety claim
  requires a review rubric that does not exist.
- **Gap**: evidence uploads are not bound to specific tasks, so a learner can
  satisfy a four-task Work Order with one image.

## 3. Interior Surface Preparation and Painting — House Flipper 2

- **Game**: simulates per-segment wall painting, panel and wainscoting options,
  colour and finish selection, and surface cleaning.
- **GG challenge requires** (3 tasks): clean all surfaces and select a paint
  system with an accent or two-tone treatment; achieve 100% coverage with the
  accent applied; write a four-part trade annotation covering sheen selection,
  primer necessity, a square-footage and gallons calculation at 350 sq ft per
  gallon, and latex versus alkyd selection.
- **Academy teaches**: nothing. No Work Order exists.
- **Evidence collected**: none by Academy.
- **Skill claimed**: none.
- **Evidence can actually support**: the annotation is the strongest cognitive
  artifact in any of the five paths — it demands quantity take-off and material
  selection reasoning that transfers to real work. The screenshots support only
  that coverage was achieved in-game.
- **Gap**: the highest-value assessable content in the Golden Path set is
  currently not imported into Academy at all.

## 4. Preflight Aircraft Inspection — Microsoft Flight Simulator 2024

- **Game**: simulates a Career Mode exterior walkaround with interactive
  inspection pins (pitot cover, chocks, oil), and penalises missed items in
  flight.
- **GG challenge requires** (4 tasks): start a career pilot; complete the full
  walkaround interacting with every pin; fly the mission start-to-shutdown
  without skipping segments; write a four-sentence annotation on consequences of
  missed items, why written checklists beat memory, and transfer of pre-task
  inspection to another trade.
- **Academy teaches**: the same four tasks verbatim, at beginner difficulty,
  60 minutes, 20 XP, min score 80 / max damage 5. Placed as lesson
  "Cockpit Flow, Before Takeoff" in course "MSFS 2024 — Simulation Stubs".
- **Evidence collected**: 1–5 uploads (image/video/document), required.
- **Skill claimed**: implicitly, pre-task inspection discipline — and via the
  course placement, an aviation cockpit-flow competency the tasks do not test.
- **Evidence can actually support**: that a walkaround was performed in a
  simulator and that the learner can articulate why inspection matters. It
  cannot support any airworthiness or aviation-maintenance claim, and it does
  not support "cockpit flow" at all.
- **Gap**: **lesson title and Work Order content are misaligned** — the lesson
  is named for cockpit flow, the Work Order is a walkaround. The course is
  explicitly named "Simulation Stubs", indicating placeholder curriculum
  carrying a real imported activity.
- **Gap**: task-level provenance (`source_task_id`) is null on all four tasks,
  so Academy cannot prove which Academy task corresponds to which GG task.

## 5. Trailer Positioning and Dock Approach — American Truck Simulator

- **Game**: simulates articulated-vehicle reversing with mirror views and
  external cameras.
- **GG challenge requires** (5 tasks): straight-line reverse finishing centered;
  offset backing into an adjacent box; a 90-degree alley dock; mirror discipline
  with early drift correction shown in a 30–60s clip; and a setup-position proof
  paired with the final position.
- **Academy teaches**: nothing. No Work Order exists.
- **Evidence collected**: none by Academy.
- **Skill claimed**: none.
- **Evidence can actually support**: this path has the strongest *process*
  evidence of the five — the mirror-discipline task explicitly demands
  continuous video, and the setup-quality task demands a before/after pair.
  Those can support a genuine claim about backing technique in a simulator,
  though not a CDL-equivalent claim.
- **Gap**: Academy is missing the one Golden Path whose evidence design already
  captures process rather than outcome.

---

## Systemic findings across all five

1. **Outcome evidence dominates.** Four of five paths prove mostly end states.
   Only ATS requires continuous process capture. Any skill claim built on
   end-state screenshots is weaker than the claim currently implied.
2. **Evidence is not bound to tasks.** Academy's `evidence_requirements` is a
   single Work Order level bucket (1–5 files, any of image/video/document, no
   instructions). GG's tasks each name a specific artifact. The task-to-artifact
   mapping is lost on import.
3. **No structured skill data exists.** `work_orders` has no skills field and
   the only credential types in the platform are the two generic ones
   (`play_achievement`, `play_evidence`). Every "skill" a learner appears to
   demonstrate is inferred from titles, industry framing and course placement —
   exactly the kind of inference Phase 1B forbids for identity and which
   Phase 2 must replace with evidence-backed claims.
4. **Success criteria are simulator scores.** `min_score: 80` and
   `max_damage: 5` are identical across every imported Work Order examined.
   They are not calibrated per activity and carry no educational meaning.
5. **Written annotations are the strongest transferable artifacts** and the
   least supported by tooling — they flow into the same generic upload bucket as
   a screenshot, with no rubric, no reviewer guidance and no review requirement.
6. **Industry framing duplicates learning records.** Presenting one challenge as
   both a Construction Simulator and a Fiber Tech Work Order means a learner
   could accrue evidence twice for a single demonstrated activity.
