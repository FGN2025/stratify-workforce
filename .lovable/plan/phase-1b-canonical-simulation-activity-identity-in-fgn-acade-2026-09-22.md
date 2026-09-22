# Phase 1B — Canonical Simulation Activity identity in FGN Academy

Additive integration. No rebuild, no learner-facing change, no new credentials.
Approved with refinements; work stops at the Golden Path review checkpoint.

## What exists today (verified)

- 57 Work Orders: 49 carry `fgn_origin_challenge_id` and a `metadata.play_source` snapshot, all 57 carry `source_challenge_id`, 48 are active.
- `source_challenge_id` and `fgn_origin_challenge_id` are **not** the same value on most rows. Both stay exactly as they are; no attempt to reconcile them to each other.
- Eight Work Orders (the OSHA safety set and others) have no play origin — Academy-native, and that stays a valid resolved state.
- The Academy reads play.fgn.gg through one authenticated pipe (`fetch-challenges` → the ecosystem API with the stored ecosystem key); imports run through `import-challenge-as-workorder`, already idempotent on `fgn_origin_challenge_id`.
- Nothing in the codebase mentions `simulation_activity_id` yet.

## Step 1 — Discover the live FGN.GG contract

Admin-only probe that calls the ecosystem API with the stored key and records exactly which actions exist and which fields each returns: challenge payloads, the activity list action, the single-activity lookup. Everything downstream is built against what actually comes back — no guessed field names, no title matching.

Output: `docs/api/integration-guides/gg-simulation-activity-contract.md`.

## Step 2 — Store the canonical identity

- Nullable `simulation_activity_id` (uuid) on `work_orders`. No foreign key to any local entity — it is an externally owned identifier. Academy never generates, replaces or reinterprets it.
- `simulation_activity_cache`: an explicitly disposable read-through cache, fully reconstructable from FGN.GG, holding canonical id, canonical name, GG game identity, game version/edition, canonical status, source updated timestamp, source/schema version, Academy `last_synced_at`, and the raw source payload for forward compatibility. Canonical fields are not editable from Academy, and no educational interpretation lives here.
- Existing rows stay null; nothing breaks while null. All existing provenance fields untouched.

## Step 3 — Import and completion sync

- `import-challenge-as-workorder`: carry the canonical id through on create; idempotency stays keyed on the existing challenge id so re-import never duplicates.
- Completion sync may **use** the canonical id to validate provenance but does not denormalize another copy onto completion records. The relationship stays Completion → Work Order → canonical id. If a remapping case later demands a completion-time snapshot, that use case gets documented before any extra stored copy is added.
- Receiving a canonical id never triggers completion, XP, badges, credentials, skill verification, assessment or course progress. No credential rule changes.

## Step 4 — Reconciliation with admin approval

A reconcile run walks each Work Order, resolves its verified provenance (primarily `fgn_origin_challenge_id`) against the live GG contract, and writes **proposals** into a staging table separate from `work_orders`: proposed canonical id, match basis, GG challenge id, determinism/confidence, status, diagnostics. Nothing touches `work_orders` until an admin approves. Title similarity is never used.

Statuses split into healthy — MATCHED, ACADEMY NATIVE — and genuine exceptions — NEEDS REVIEW, LEGACY SOURCE, ORPHANED SOURCE. RETIRED describes lifecycle, not identity failure. Once an admin confirms ACADEMY NATIVE, it is resolved: the canonical id stays null, it stops appearing as an exception, and later runs preserve that classification unless deliberately reopened.

## Step 5 — Activity Mapping Console (admin only)

New admin view of the chain: Simulation Activity → GG Challenge → Academy Work Order → Academy interpretation. Shows activity name and id, game, challenge and id, Work Order and id, Academy source ids, learning objective / skills / evidence status, mapping status. Actions: approve, reject, mark native, re-run reconcile. Read-only with respect to FGN.GG.

## Step 6 — Five Golden Paths (the checkpoint)

Retrieve the five canonical activities live from FGN.GG — real names and ids, nothing invented. Per path, report identity alignment: canonical activity and id, GG challenge and id, Academy `source_challenge_id`, `fgn_origin_challenge_id`, `work_order_id`, whether the origin id resolves to the expected live challenge, whether that challenge reports the expected canonical id, whether the Work Order is therefore deterministically linkable, game/version/edition on each side, and any discrepancy.

Then learning alignment: Academy learning objective, Work Order tasks, existing skills and tags, evidence requirements, assessment/review method, course/lesson relationship, credential relationship. Plus the 11 reconciliation questions. No edits to those five Work Orders.

Output: `docs/golden-paths-reconciliation.md`.

## Step 7 — Skills and evidence findings only

Per Golden Path, separate: what the game activity does; what the GG challenge requires; what the Academy Work Order teaches; what evidence is collected; what skill the current system claims; what the evidence can actually support. Report discrepancies, missing and duplicate skills, naming inconsistencies, manual vs automated evidence, outcome vs process, human review, telemetry availability. Fix nothing — this feeds Phase 2.

Output: `docs/golden-paths-skills-evidence-findings.md`.

## Step 8 — Health check, then STOP

Extend the Integration Health Check with independent live checks: activity list action reachable, single-activity lookup reachable, canonical ids present for the five Golden Paths, and the challenge → canonical id relationship. A cache hit alone never counts as proof of a healthy live connection. Existing checks stay untouched.

Regression pass over homepage, Work Order catalog/detail/completion, evidence upload and review, courses, lessons, communities, tenant curation, XP, badges, credentials, Skill Passport, AI coach, public catalog and the existing play integration.

Then **stop before writing canonical ids to the remaining catalog** and return the three documents plus a summary of deterministic matches, identity conflicts, educational-content conflicts, evidence gaps, game-edition issues, legacy-source issues, and recommended changes before broad migration.

## Boundaries held

- FGN.GG owns canonical identity; Academy consumes it and never mints it.
- Canonical identity is not tenant-specific; two tenants using one activity share one id.
- Academy-native Work Orders stay first-class, with no challenge and no canonical id.
- "Simulation Activity" never appears in learner-facing wording.
- Challenge completed ≠ Work Order completed ≠ skill practised ≠ demonstrated ≠ verified ≠ credential.
- Game edition differences are flagged for review, never silently merged.
- No destructive migration; no title-based identity inference.

## Not in this phase

Universal skills taxonomy, evidence + skills engine, AI evidence scoring, telemetry implementation, Skill Passport redesign, Academy-side canonicalization workflow, public-site redesign, retroactive XP or badges.
