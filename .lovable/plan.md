# Phase 1B — Canonical Simulation Activity identity in FGN Academy

Additive integration. No rebuild, no learner-facing change, no new credentials.

## What exists today (verified)

- 57 Work Orders: 49 carry `fgn_origin_challenge_id` and a `metadata.play_source` snapshot, all 57 carry `source_challenge_id`, 48 are active.
- `source_challenge_id` and `fgn_origin_challenge_id` are **not** the same value on most rows — one is an Academy-side identifier, the other the play.fgn.gg challenge id. Both stay as-is.
- Eight Work Orders (the OSHA safety set and others) have no play origin — these are Academy-native and must stay that way.
- The Academy reads play.fgn.gg through one authenticated pipe (`fetch-challenges` → the ecosystem API with the stored ecosystem key), and imports through `import-challenge-as-workorder`, which is already idempotent on `fgn_origin_challenge_id`.
- Nothing in the codebase mentions `simulation_activity_id` yet.

## Step 1 — Discover the live FGN.GG contract

Add an admin-only probe that calls the ecosystem API with the stored key and records exactly which actions exist and which fields each returns (challenge payloads, the activity list action, the single-activity lookup action). Everything after this is built against what actually comes back — no guessed field names, no title matching.

Output: `docs/api/integration-guides/gg-simulation-activity-contract.md`.

## Step 2 — Store the canonical identity

Add nullable `simulation_activity_id` (uuid) to `work_orders`, plus a small `simulation_activity_cache` table that is clearly marked as a read-through copy of FGN.GG data (name, game, edition, last synced). The Academy never generates these ids. Existing rows stay null and nothing breaks while null. Existing provenance fields untouched.

## Step 3 — Import and completion sync

- `import-challenge-as-workorder`: carry the canonical id through on create, keep idempotency keyed on the existing challenge id so re-import never duplicates.
- Completion sync from play: record the canonical id as provenance only. It may not touch objectives, skills, rubrics, evidence rules, course/lesson mappings, review outcomes, XP, badges or credentials.
- No credential rule changes. Linking an old Work Order to a canonical activity mints nothing and re-awards nothing.

## Step 4 — Reconciliation with admin approval

A reconcile job walks each Work Order, looks up its challenge on FGN.GG, and **proposes** a canonical id into a staging table with a status: MATCHED, NEEDS REVIEW, ACADEMY NATIVE, LEGACY SOURCE, ORPHANED SOURCE, RETIRED. Deterministic id-to-id matches can be proposed as exact; ambiguous ones wait for an admin. Nothing is written to a Work Order without approval. Title matching is never used.

## Step 5 — Activity Mapping Console (admin only)

New tab in the admin area showing the chain: Simulation Activity → GG Challenge → Academy Work Order → Academy interpretation. Columns: activity name and id, game, challenge and id, Work Order and id, Academy source ids, learning objective / skills / evidence status, mapping status. Actions: approve, reject, mark native, re-run reconcile. Read-only with respect to FGN.GG.

## Step 6 — Five Golden Paths

Pull the five approved activities live from FGN.GG (House Flipper 2, Construction Simulator, Farm Sim 2025, American Truck Simulator, MSFS 2024 — real names and ids from the API, not invented), match each to its Academy Work Order, and answer the 11 reconciliation questions per path (source id agreement, conflicts, active state, tasks, evidence requirements, course/lesson mappings, credential participation). No edits to those five until the report is reviewed.

Output: `docs/golden-paths-reconciliation.md`.

## Step 7 — Skills and evidence findings only

Report per golden path: existing skills and tags, missing ones, naming inconsistencies, possible duplicates; and what evidence GG asks for vs what Academy asks for, manual vs automated, outcome vs process, human review, telemetry availability. No taxonomy redesign, no evidence engine, no AI scoring.

Output: `docs/golden-paths-skills-evidence-findings.md`.

## Step 8 — Health check and regression pass

Extend the existing Integration Health Check with: activity list reachable, single-activity lookup reachable, canonical id present for all five golden paths. Existing checks stay. Then verify no change to the homepage, Work Order catalog/detail/completion, evidence upload and review, courses, lessons, communities, tenant curation, XP, badges, credentials, Skill Passport, AI coach, public catalog and the existing play integration.

## Boundaries held

- Canonical identity is owned by FGN.GG; the Academy consumes it and never mints it.
- Canonical identity is not tenant-specific; two tenants using one activity share one id.
- Work Orders may exist with no challenge and no activity — Academy-native stays first-class.
- "Simulation Activity" never appears in learner-facing wording.
- Challenge completed ≠ Work Order completed ≠ skill practised ≠ demonstrated ≠ verified ≠ credential.
- Game edition differences are flagged for review, never silently merged.

## Not in this phase

Universal skills taxonomy, evidence + skills engine, AI evidence scoring, telemetry integration, Skill Passport redesign, Academy-side canonicalization workflow, public-site redesign.
