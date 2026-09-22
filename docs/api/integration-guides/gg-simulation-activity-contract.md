# FGN.GG Simulation Activity contract (live, verified 2026-09-22)

Captured by probing the live `ecosystem-data-api` on play.fgn.gg with the stored
ecosystem key (`X-Ecosystem-Key`, `X-Ecosystem-App: academy`). Every field below
was observed in an actual response — nothing here is assumed.

Probe function: `supabase/functions/gg-activity-probe` (admin-only, read-only).

## Valid actions

The API reports its own action list in the 400 error body for an unknown action:

```
tournaments, tenant-events, challenges, games, quests,
player-progress, achievements, season-stats,
simulation-activities, simulation-activity
```

`simulation-activities` and `simulation-activity` are the two new Simulation
Activity lookups.

## `challenges` — now carries canonical identity

Request: `{ "action": "challenges", "limit": 500, "page": 0, "include_inactive": true }`
Response: `{ "challenges": [...] }` (also accepted as `data`).

Challenge record keys observed:

```
id, name, description, game_id, challenge_type, difficulty, points_reward,
estimated_minutes, start_date, end_date, requires_evidence, cover_image_url,
is_active, is_featured, created_at, updated_at,
simulation_activity_id, content_classification, simulation_activity,
game_name, tasks
```

New in Phase 1:

| field | type | notes |
|---|---|---|
| `simulation_activity_id` | uuid \| null | canonical activity id; null on unmapped challenges |
| `simulation_activity` | object \| null | embedded canonical activity record; null when unmapped |
| `content_classification` | string \| null | e.g. `"simulation"`; null on unclassified challenges |

Task records carry `id`, `challenge_id`, `title`, `description`, `display_order`.

## `simulation-activities` — list

Request: `{ "action": "simulation-activities", "limit": 50, "page": 0 }`
Response: `{ "data": [ ... ] }`.

Activity record keys observed:

```
id, simulation_activity_id, canonical_name, canonical_slug,
canonical_description, game_id, game_name, game_slug, game_version,
platform_applicability, activity_category, industry_domain,
status, provenance, schema_version, created_at, updated_at, challenges
```

Notes:

- `id` and `simulation_activity_id` were identical on every record returned.
- `game_version` is present but may be null (`Construction Simulator`,
  `American Truck Simulator` both returned null; House Flipper 2 = `"2"`,
  MSFS = `"2024"`, Farm Simulator = `"2025"`).
- `status` was `"active"` on all five; `provenance` was `"derived_from_challenge"`.
- `schema_version` = `1`.
- `platform_applicability` was an empty array on all five.
- `challenges[]` in the list form is a thin mapping: `challenge_id`,
  `challenge_task_id` (null on all five), `is_primary`, `mapping_status`
  (`"matched"`), `simulation_activity_id`.

## `simulation-activity` — single lookup

Request: `{ "action": "simulation-activity", "id": "<uuid>" }`
Response: `{ "data": { ... } }` — same keys as the list record, but
`challenges[]` is expanded into full challenge records including `tasks`,
`content_classification`, `is_active`, `difficulty`, `game_id`, `updated_at`.

## The five Golden Paths (live values)

| canonical activity | simulation_activity_id | game (version) | primary challenge_id |
|---|---|---|---|
| Bulk Grain Hauling | `6ac1275d-6c8d-41c0-ad52-9f22bd13ea2e` | Farm Simulator 2025 (2025) | `7ceee2be-1279-45a1-97eb-618db5d403d7` |
| Excavation and Trenching | `086eefb4-bff0-4826-8543-22864689cd2e` | Construction Simulator (null) | `02481a75-383c-485a-bdff-f0a4dd2b9121` |
| Interior Surface Preparation and Painting | `19720a68-04bd-4dae-8f74-17e91d14d4b5` | House Flipper 2 (2) | `c79a46d4-9aa6-43b2-914f-1f83419f2586` |
| Preflight Aircraft Inspection | `b12e6fe2-1758-4409-84ff-762cc66323f4` | Microsoft Flight Simulator 2024 (2024) | `7846317c-77b2-4dd4-a855-308cb659891a` |
| Trailer Positioning and Dock Approach | `b6e90c9b-0c62-4232-ab04-a92064af191b` | American Truck Simulator (null) | `f969023f-d69e-4323-a508-778c6a92e7fa` |

`activity_category` / `industry_domain` per path: logistics/agriculture,
equipment_operation/construction, finishing_work/residential_trades,
inspection/aviation, vehicle_operation/transportation.

## How Academy uses this

- Deterministic link: Academy `work_orders.fgn_origin_challenge_id` →
  GG `challenges.id` → `challenges.simulation_activity_id`. No title matching.
- `simulation_activity_id` is externally owned. Academy stores it, never mints it.
- The cache table `simulation_activity_cache` mirrors the fields above and is
  fully reconstructable from these two actions.
