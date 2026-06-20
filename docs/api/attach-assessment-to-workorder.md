# attach-assessment-to-workorder

Edge Function that attaches an authored simulation (assessment) to an existing work order on fgn.academy. This is the second step of the Surface 2 bridge from play.fgn.gg challenges to fgn.academy work orders. The first step is [import-challenge-as-workorder](./import-challenge-as-workorder.md).

This document describes the live, deployed contract. It is the single source of truth for the Configurator and any future integration. No function or schema changes are implied by this doc.

## Endpoint

```
POST https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/attach-assessment-to-workorder
```

Headers:

```
Authorization: Bearer <admin user JWT>
apikey: <anon key>
Content-Type: application/json
```

The gateway runs with `verify_jwt=false`; auth is enforced in code. Auth gate, in order:

- missing Bearer -> `401 Unauthorized`
- invalid or anon-only token -> `401 Invalid token`
- authenticated but non-admin user -> `403 Admin access required`

## Binding model (read this first)

Two fields bind the simulation, and they serve different roles. Both are required.

- **`work_order_id`** (uuid) is the actual foreign key. It must equal `work_orders.id`. This is what ties the simulation row to the work order. The function pre-flights it with `SELECT id, tenant_id FROM work_orders WHERE id = :work_order_id` and returns `404 work_order not found` if it is missing.
- **`wo_code`** (text, 1..64) is a Configurator-defined external code that lives only on `public.simulations.wo_code` (UNIQUE). It is the upsert key (`onConflict: 'wo_code'`), so re-sending the same body is idempotent. It does not exist on `work_orders` and is not derived from any `work_orders` column.

**Cross-binding guard.** If a `wo_code` already exists on a simulation tied to a *different* `work_order_id`, the function rejects with `409 wo_code already bound to a different work_order` and returns the existing `work_order_id`. Choose one `wo_code` per work order and keep it stable.

`fgn_origin_challenge_id` and `source_challenge_id` on `work_orders` are not used by this function. They are the cross-platform identity for the import path only.

## Relationship

`public.simulations.work_order_id uuid NOT NULL` is the reference column. `wo_code` is `UNIQUE`, which enforces a single live simulation per external code. The result is logically 1:1 with the work order as long as the Configurator uses one stable `wo_code` per `work_order_id`.

## Request body

Top-level fields:

| field | type | required | notes |
|---|---|---|---|
| `work_order_id` | uuid | yes | must exist in `work_orders` |
| `wo_code` | string 1..64 | yes | unique upsert key on `simulations` |
| `sim_id_external` | string <=128 \| null | no | |
| `title` | string 1..255 | yes | |
| `sim_type` | enum | yes | exactly `sequence` \| `loadout` \| `resource_selection` \| `method_selection` |
| `game_prefix` | string <=64 \| null | no | |
| `job_type` | string <=64 \| null | no | |
| `job_label` | string <=128 \| null | no | |
| `blurb` | string <=2000 \| null | no | |
| `briefing` | array | no | default `[]` |
| `facts` | array | no | default `[]` |
| `cats` | array | no | default `[]` |
| `config` | object | no | default `{}` |
| `track_key` | string <=64 | no | default `"msfs-2024"` |
| `status` | enum | no | default `"draft"`; `draft` \| `published` \| `archived` |
| `tenant_id` | uuid \| null | no | falls back to `work_orders.tenant_id` if omitted |
| `items` | array 1..500 | yes | see below |

`items[]` (replaces all rows; delete-then-insert under the service role):

| field | type | required | notes |
|---|---|---|---|
| `item_key` | string 1..128 | yes | |
| `cat_key` | string <=128 \| null | no | |
| `icon` | string <=128 \| null | no | |
| `name` | string 1..255 | yes | |
| `sub` | string <=500 \| null | no | |
| `display_order` | int >=0 | no | default array index |
| `correct` | boolean | no | default false |
| `critical` | boolean | no | default false |
| `seq` | int \| null | no | |
| `why` | string <=2000 \| null | no | |

All four `sim_type` values are accepted by the Zod schema. The DB CHECK constraint expansion to allow `resource_selection` and `method_selection` shipped in migration `20260618232941_*.sql`. Deployments earlier than that surface a `simulations_sim_type_check` error with the hint string the function emits.

## Lifecycle

The function does not inspect `work_orders.is_active` or any lifecycle flag. Attaching to an already-active work order is allowed. Lifecycle staging is a Configurator-side workflow choice, not a server constraint. The body's `status` field controls the simulation lifecycle (`draft` / `published` / `archived`) independently of the work order.

## Response

`200`:

```json
{
  "simulation": {
    "id": "uuid",
    "wo_code": "string",
    "work_order_id": "uuid",
    "sim_type": "sequence|loadout|resource_selection|method_selection",
    "status": "draft|published|archived",
    "updated_at": "timestamptz"
  },
  "items_written": 0
}
```

Re-sending the same body is idempotent: the simulation upserts on `wo_code` and the items are replaced wholesale. Sending the same `wo_code` with a different `work_order_id` returns `409`.

Note: `public.simulation_items` is now admin-readable over REST. With a valid admin JWT plus the anon key, `GET /rest/v1/simulation_items?simulation_id=eq.<id>&select=*` returns the rows so callers can verify the write. Non-admin authenticated reads remain limited to the existing student-safe column set; anon is denied.

## cURL example

```bash
curl -s -X POST \
  "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/attach-assessment-to-workorder" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "eff75523-423a-4005-9af2-1d9d1d80e8f0",
    "wo_code": "WO-2611",
    "title": "Aerial fiber placement, strand and lash",
    "sim_type": "sequence",
    "items": [
      { "item_key": "step-1", "name": "First step", "seq": 1, "correct": true }
    ]
  }'
```

## Acceptance check

Send the minimum viable body above against work order `eff75523-423a-4005-9af2-1d9d1d80e8f0`. Expect `200` with `{ simulation: { id, wo_code, work_order_id, sim_type, status, updated_at }, items_written: N }`.

Verify:

```sql
SELECT id, wo_code, sim_type, status, updated_at
FROM public.simulations
WHERE work_order_id = 'eff75523-423a-4005-9af2-1d9d1d80e8f0';

SELECT count(*) FROM public.simulation_items
WHERE simulation_id = '<returned simulation.id>';
```

Re-sending the same body is idempotent. Sending the same `wo_code` with a different `work_order_id` returns `409`.
