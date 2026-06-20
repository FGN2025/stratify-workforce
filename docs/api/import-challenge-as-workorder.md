# import-challenge-as-workorder

Edge Function that imports one or more play.fgn.gg challenges into fgn.academy as work orders. This is the first step of the Surface 2 bridge from play.fgn.gg challenges to fgn.academy work orders. The second step is [attach-assessment-to-workorder](./attach-assessment-to-workorder.md).

This document describes the live, deployed contract, verified end to end against the production backend in June 2026. It is the single source of truth for the Configurator and any future integration. No function or schema changes are implied by this doc.

## Endpoint

```
POST https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/import-challenge-as-workorder
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

## What it does

For each play challenge id supplied, the function fetches the challenge from play.fgn.gg (via an internal `fetch-challenges` step), then creates a matching work order on fgn.academy. Behavior confirmed live:

- **Idempotent on `fgn_origin_challenge_id`.** Re-importing a challenge that was already imported returns `status: "existing"` and the same `work_order_id`; it does not create a duplicate.
- **Lands inactive for review.** Newly created work orders are staged for human review (the import does not publish or activate them). Lifecycle activation is a deliberate downstream step on fgn.academy.
- **Preserves the play source.** The full play challenge record is stored on the work order under `metadata.play_source`, and `fgn_origin_challenge_id` is set to the play challenge id. This is the cross-platform identity used to keep the academy work order linked back to its play origin. `source_challenge_id` is also populated.

The play challenge tasks are imported into the work order. The per-item `tasks_imported` count (when present) reports how many were brought over.

## Request body

| field | type | required | notes |
|---|---|---|---|
| `challenge_ids` | array of strings, 1..50 | yes | play.fgn.gg challenge UUIDs |

An empty array is rejected with `400` and the message `challenge_ids must be a non-empty array of <=50 strings`. (This is also the recommended auth-probe: sending `[]` with a valid admin token returns this structured 400, which proves auth passed without writing anything. Anon-only returns `401 Invalid token`.)

The challenge ids must be the **full** play challenge UUIDs and must correspond to challenges that actually exist in the play `fetch-challenges` response. A wrong or stale id produces a per-item error (see below); it does not fail the whole batch.

## Response

`200` with a per-item results array. The HTTP status is 200 even when individual items error; check each item's `status`.

```json
{
  "results": [
    {
      "challenge_id": "7846317c-77b2-4dd4-a855-308cb659891a",
      "work_order_id": "eff75523-423a-4005-9af2-1d9d1d80e8f0",
      "status": "created",
      "play_source_present": true
    }
  ]
}
```

Per-item fields:

| field | type | notes |
|---|---|---|
| `challenge_id` | string | the play challenge id echoed back |
| `work_order_id` | uuid \| null | the academy work order id; null when `status` is `error` |
| `status` | enum | `created` \| `existing` \| `error` |
| `play_source_present` | boolean | true when the play source was captured into `metadata.play_source` (present on success) |
| `error` | string | present only when `status` is `error` |

Status meanings:

- **`created`** a new work order was made for this challenge.
- **`existing`** the challenge was already imported (idempotent hit on `fgn_origin_challenge_id`); the existing `work_order_id` is returned.
- **`error`** this item could not be imported; `error` carries the reason and `work_order_id` is null. A common cause is `challenge not found in fetch-challenges response`, which means the supplied id is wrong, stale, or the challenge is not visible to the function's fetch step. The rest of the batch still processes.

Note: the response does **not** include a `wo_code`. `wo_code` is a Configurator-chosen value set during the attach step, not assigned by import. To bind an assessment, take the returned `work_order_id` and pass it (plus a stable Configurator-chosen `wo_code`) to attach-assessment-to-workorder.

## cURL example

```bash
curl -s -X POST \
  "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/import-challenge-as-workorder" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "challenge_ids": ["7846317c-77b2-4dd4-a855-308cb659891a"] }'
```

## Acceptance check

Auth probe (no write):

```bash
# expect 400 {"error":"challenge_ids must be a non-empty array of <=50 strings"} with a valid admin token
curl -s -X POST ".../functions/v1/import-challenge-as-workorder" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{ "challenge_ids": [] }'
```

Live import: send one real, active play challenge id. Expect `200` with a single result whose `status` is `created` (first time) or `existing` (already imported) and a non-null `work_order_id`.

Verify the work order and its preserved play source:

```sql
SELECT id, title, is_active, fgn_origin_challenge_id, source_challenge_id,
       metadata -> 'play_source' ->> 'id' AS play_challenge_id
FROM public.work_orders
WHERE fgn_origin_challenge_id = '<play challenge id>';
```

Re-running the same import returns `status: "existing"` with the same `work_order_id`, confirming idempotency.

## Verified example (June 2026)

Importing play challenge `7846317c-77b2-4dd4-a855-308cb659891a` (MSFS Flight: Preflight Walkaround) returned work order `eff75523-423a-4005-9af2-1d9d1d80e8f0` with `play_source_present: true`. The work order row carried `fgn_origin_challenge_id` equal to the play id, the full play record under `metadata.play_source`, `is_active: true`, and `source_challenge_id` populated. That same work order id was then used as the `work_order_id` for the attach step.
