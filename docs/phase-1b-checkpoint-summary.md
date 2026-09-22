# Phase 1B checkpoint — review required before any broad migration

Status: **STOPPED at the approval gate.** No canonical Simulation Activity id
has been written to any Work Order. Every mapping is a proposal in
`simulation_activity_reconciliation`. Nothing proceeds past this point without
explicit approval.

Read alongside:
- `docs/api/integration-guides/gg-simulation-activity-contract.md` — the live GG contract
- `docs/golden-paths-reconciliation.md` — identity and learning alignment, five paths
- `docs/golden-paths-skills-evidence-findings.md` — skills and evidence observations

---

## What is in place

- `work_orders.simulation_activity_id` — nullable, no FK, indexed. Empty today.
- `simulation_activity_cache` — disposable mirror of GG canonical records,
  service-role write only, no educational fields.
- `simulation_activity_reconciliation` — proposals only, one row per Work Order.
- Import and sync carry the canonical id as provenance; existing
  `source_challenge_id`, `fgn_origin_challenge_id` and `metadata.play_source`
  are untouched. Sync logs identity mismatches and blocks nothing.
- Activity Mapping Console at `/admin/activity-mapping`, platform admin only.
  Approval there is the only path that writes a canonical id.
- Integration Health Check extended with four live canonical checks
  (activity list, single lookup, five Golden Path ids, challenge→activity link).
  All four pass; cache is never accepted as evidence.

## Deterministic matches

| | count |
|---|---|
| Work Orders examined | 57 |
| MATCHED (single, unambiguous, deterministic on `fgn_origin_challenge_id`) | 1 |
| LEGACY SOURCE | 4 |
| NEEDS REVIEW | 52 |
| Canonical activities published by GG | 5 |
| Canonical activities with no Academy Work Order | 3 |

The single deterministic match is **Preflight Aircraft Inspection** →
`eff75523-423a-4005-9af2-1d9d1d80e8f0`. It is safe to approve.

## Identity conflicts

1. **Excavation and Trenching claimed by two Work Orders** —
   `f4347636-…` (Fiber_Tech) and `f98c218c-…` (Construction_Sim). Both held at
   NEEDS REVIEW. Requires a policy decision: may one canonical activity be
   presented as two industry-framed Work Orders, and if so which row holds the
   canonical id?
2. **The same duplication pattern exists on Conduit Placement and Backfill**
   (`1c899b1a-…`) and will surface as a conflict as soon as GG publishes a
   canonical activity for it. Expect more as GG coverage grows.
3. **52 Work Orders cannot be resolved yet** because GG has not published a
   canonical activity for their challenge. This is GG-side coverage, not an
   Academy defect. They should not be forced into any mapping.

## Educational content conflicts

- The MSFS Work Order sits in a lesson titled "Cockpit Flow, Before Takeoff"
  inside a course named "MSFS 2024 — Simulation Stubs". Lesson title and Work
  Order content do not match, and the course is explicitly placeholder.
- `success_criteria` is identical (`min_score: 80`, `max_damage: 5`) across
  every imported Work Order — not calibrated per activity.
- No Academy Work Order carries a distinct learning objective field; the GG
  challenge description is doing that job.

## Evidence gaps

- Evidence is collected at Work Order level (1–5 files, any type, no
  instructions) while GG specifies a distinct artifact per task. The
  task-to-artifact mapping is lost on import — a four-task Work Order can be
  satisfied with one screenshot.
- Four of five Golden Paths capture end states, not process. Only the ATS path
  requires continuous video.
- Written trade annotations are the strongest transferable artifacts and have
  no rubric, no reviewer guidance and no review requirement.
- `work_orders` has no skills field; the only credential types on the platform
  are the two generic `play_achievement` and `play_evidence`. Every apparent
  skill claim is inferred from titles and placement.

## Game edition issues

- GG carries `game_version` (`"2025"`, `"2"`, `"2024"`, and null for
  Construction Simulator and American Truck Simulator). Academy carries only a
  `game_title` enum with edition baked into the name.
- No programmatic edition comparison is reliable. In particular, the House
  Flipper 2 canonical activity must **not** be attached to Academy's
  `House_Flipper` painting Work Order — different edition, different challenge.

## Legacy source issues

- `source_challenge_id` and `fgn_origin_challenge_id` differ on most rows.
  `fgn_origin_challenge_id` is the reliable GG key; `source_challenge_id` is
  frequently an Academy-side id. Both are preserved as provenance.
- Four Work Orders resolve only through a legacy source identifier and are
  flagged LEGACY SOURCE rather than matched.
- Task-level provenance is inconsistent: the trench Work Orders carry
  `source_task_id` on every task, the MSFS Work Order carries none.

## Recommended next actions, in order

1. Approve the single MSFS match.
2. Decide the industry-framing duplication policy, then resolve the trench pair.
3. Ask GG to publish canonical activities for the remaining challenge catalog;
   until then leave the 52 at NEEDS REVIEW rather than mapping them.
4. Decide whether Academy should import the three unrepresented Golden Paths
   (Bulk Grain Hauling, HF2 painting, ATS dock approach) as Work Orders.
5. Rename or rebuild the "Simulation Stubs" course and fix the MSFS lesson title.
6. Carry to Phase 2: per-task evidence binding, rubrics for written annotations,
   calibrated success criteria, and a structured skills field so claims are
   evidence-backed rather than inferred.

**No broad migration, no credential issuance, no retroactive XP or badges, and
no title-based inference has been performed or is proposed here.**
