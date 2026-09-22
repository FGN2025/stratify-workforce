# Roadmap — Phase 1B: Canonical Simulation Activity identity

- [ ] Step 1 — Discover live FGN.GG contract (probe + `docs/api/integration-guides/gg-simulation-activity-contract.md`)
- [ ] Step 2 — `work_orders.simulation_activity_id` (uuid, nullable, no FK) + disposable `simulation_activity_cache`
- [ ] Step 3 — Carry canonical id through `import-challenge-as-workorder`; completion sync validates provenance only
- [ ] Step 4 — Reconciliation staging table + proposal run (no writes to `work_orders` without approval)
- [ ] Step 5 — Admin Activity Mapping Console
- [ ] Step 6 — Five Golden Paths reconciliation report (`docs/golden-paths-reconciliation.md`)
- [ ] Step 7 — Skills/evidence findings (`docs/golden-paths-skills-evidence-findings.md`)
- [ ] Step 8 — Health check extensions + regression pass, then STOP before broad catalog migration
