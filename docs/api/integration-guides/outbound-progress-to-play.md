# Academy → Play: Work Order & Challenge progress ingest

**Status:** Academy side is built and queuing live events. Blocked on Play shipping the receiving endpoint below.

## Why

`ecosystem-data-api` on play.fgn.gg is read-only — its valid actions are
`tournaments, tenant-events, challenges, games, quests, player-progress, achievements, season-stats`.
There is no write path, so Academy progress cannot currently land on Play.

## What Play needs to build

A single HTTPS endpoint (suggested: `POST /functions/v1/academy-progress-ingest`).

### Authentication

Two independent checks, both already in place on the Academy side:

1. Header `X-Ecosystem-Key` must equal the shared `ECOSYSTEM_API_KEY` (same value both sides today).
2. Header `X-Signature-256: sha256=<hex>` — HMAC-SHA256 of the **raw request body** using the shared
   `PLAY_WEBHOOK_SECRET`. Reject on mismatch with 401.

Also sent: `X-Ecosystem-App: academy`, `X-Delivery-Id: <uuid>`, `X-Event-Type: <event>`.

### Idempotency

`delivery_id` is stable per queued event and replayed on retry. Play must treat a repeated
`delivery_id` as a no-op and still return 2xx.

### Body

```json
{
  "event": "work_order.completed",
  "source": "fgn-academy",
  "delivery_id": "6f1c…",
  "timestamp": "2026-09-19T00:00:00.000Z",
  "data": {
    "completion_id": "…",
    "user_email": "player@example.com",
    "work_order_id": "…",
    "work_order_title": "Aerial Fiber Drop",
    "challenge_id": "…",
    "game_title": "Fiber_Tech",
    "tenant_id": "…",
    "score": 92,
    "xp_awarded": 250,
    "attempt_number": 1,
    "completed_at": "2026-09-19T00:00:00.000Z"
  }
}
```

Events emitted:

| event | when |
| --- | --- |
| `work_order.completed` | a player's Work Order completion reaches `completed` |
| `work_order.task_completed` | a single task inside a Work Order is marked done (`task_id` in `data`, no score) |

### Responses

- `2xx` — accepted (Academy marks the delivery done).
- `4xx`/`5xx` — Academy retries up to 5 times, then parks the row as `dead` for manual replay.

## What Academy does once the URL exists

Save the endpoint as the secret `FGN_PLAY_INGEST_URL`; the `push-play-progress` function then drains
`play_outbound_queue` on demand from Admin → Sync Tester, and every delivery is logged in
`play_sync_attempts` with `direction = 'outbound'`.
