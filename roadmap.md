# Roadmap — Phase 1B: Canonical Simulation Activity identity

- [x] Step 1 — Discover live FGN.GG contract (probe + `docs/api/integration-guides/gg-simulation-activity-contract.md`)
- [x] Step 2 — `work_orders.simulation_activity_id` (uuid, nullable, no FK) + disposable `simulation_activity_cache`
- [x] Step 3 — Carry canonical id through `import-challenge-as-workorder`; completion sync validates provenance only
- [x] Step 4 — Reconciliation staging table + proposal run (no writes to `work_orders` without approval)
- [x] Step 5 — Admin Activity Mapping Console
- [x] Step 6 — Five Golden Paths reconciliation report (`docs/golden-paths-reconciliation.md`)
- [x] Step 7 — Skills/evidence findings (`docs/golden-paths-skills-evidence-findings.md`)
- [x] Step 8 — Health check extensions + regression pass; checkpoint summary in `docs/phase-1b-checkpoint-summary.md`

STOPPED at the approval gate. No canonical id has been written to any Work Order.
Broad catalog migration requires explicit approval.
