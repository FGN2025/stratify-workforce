# Roadmap — Phase 1B: Canonical Simulation Activity identity

- [x] Step 1 — Discover live FGN.GG contract (probe + `docs/api/integration-guides/gg-simulation-activity-contract.md`)
- [x] Step 2 — `work_orders.simulation_activity_id` (uuid, nullable, no FK) + disposable `simulation_activity_cache`
- [x] Step 3 — Carry canonical id through `import-challenge-as-workorder`; completion sync validates provenance only
- [x] Step 4 — Reconciliation staging table + proposal run (no writes to `work_orders` without approval)
- [x] Step 5 — Admin Activity Mapping Console
- [x] Step 6 — Five Golden Paths reconciliation report (`docs/golden-paths-reconciliation.md`)
- [x] Step 7 — Skills/evidence findings (`docs/golden-paths-skills-evidence-findings.md`)
- [x] Step 8 — Health check extensions + regression pass; checkpoint summary in `docs/phase-1b-checkpoint-summary.md`

## Checkpoint decisions (applied 2026-09-22)

- [x] Approve MSFS Preflight Aircraft Inspection mapping only (`eff75523-…` → `b12e6fe2-…`), identity column only
- [x] Hold both Excavation and Trenching Work Orders in review — duplicate educational record, nothing minted or retired
- [x] Preserve the Conduit Placement and Backfill duplication as a recorded pending-review item
- [x] Console: `ACCEPTED_MULTI_INTERPRETATION` resolved state, shared activity as observation, grouped view + accept action
- [x] Record the three GG-only Golden Paths as GG ONLY — ACADEMY WORK ORDER NOT YET AUTHORED (none created)
- [x] Phase 2 revised architecture written to `docs/phase-2-evidence-skills-architecture.md`

Broad catalog migration remains withheld. No Phase 2 tables have been created —
implementation of the Evidence + Skills model awaits an explicit build instruction.
