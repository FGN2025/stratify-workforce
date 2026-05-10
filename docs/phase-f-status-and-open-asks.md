# To: play.fgn.gg devs — Phase F status + asks still open

## Status (Academy side, no action needed from you)

- **Phase F shipped on Academy** (`vfzjfkcwromssjnlrhoo`). Track membership is now table-driven (`challenge_tracks` + `challenge_track_membership`), with per-track `gate_mode` (`per_challenge` vs `all_completed`), accent color, icon, and course/lesson resolution.
- **End-to-end smoke test green:**
  - 1× Fiber (`per_challenge`) fires `knowledge_check_available` immediately.
  - 4× OSHA (`all_completed`) holds the track-complete notification until the 4th completion, then fires **Track Complete: OSHA Safety Overlay**.
- **Your payload contract didn't change.** `sync-to-academy` keeps forwarding the same bytes; we derive track/course/lesson/gate on our side from `challenge_id`. No coordination needed for Phase F.

## Asks still open from plan v3 §3 (unchanged, just re-flagging)

1. **`metadata.external_attempt_id`** — per-attempt UUID stable across retries. Without it our `play_sync_attempts` idempotency key is best-effort. **Status?**
2. **`metadata.external_user_id`** — confirm it's on every push once PR **P-3** lands (we key `play_identity` on it).
3. **PR P-2 rollout window** — how long do we accept both `X-App-Key` and `X-Ecosystem-Key` before hard-failing legacy? We proposed **14 days**.
4. **PR P-3 tenant fields** — confirm shape: `metadata.tenant_id` (uuid), `metadata.tenant_slug`, `metadata.tenant_name`.
5. ~~**Webhook HMAC scheme**~~ — **resolved by Academy (we're the receiver, we own the contract).** See §6 below for the spec to implement on the dispatch side.

## 6. Webhook HMAC contract (Academy-defined, for `ecosystem-webhook-dispatch`)

Academy's `play-webhook-receiver` is deployed and running in **unsigned/shadow mode** today. Use this spec to add signing on play's side; once verified end-to-end, Academy flips `PLAY_WEBHOOK_STRICT=true` to enforce.

- **Receiver URL:** `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/play-webhook-receiver`
- **Header:** `X-Play-Signature`
- **Algorithm:** HMAC-SHA256, hex-encoded (lowercase, 64 chars), no prefix.
- **Canonical string:** the **raw request body bytes, exactly as sent** (no re-serialization, no whitespace normalization, no header concatenation). Compute the signature over the bytes you put on the wire.
- **Secret:** shared secret, distinct from `ECOSYSTEM_API_KEY`. Academy will store it as `PLAY_WEBHOOK_SECRET`. Generate a 32-byte random value and share via the usual secret-exchange channel; we'll provision both sides simultaneously.
- **Recommended companion headers (already accepted by receiver):**
  - `X-Play-Event: challenge.completed | evidence.approved | achievement.earned` (also read from `payload.event`/`payload.type`)
  - `X-Play-Delivery-Id: <uuid>` — used as our idempotency key in `play_sync_attempts.external_attempt_id`. Stable across retries of the same delivery.
- **Payload envelope (expected):**
  ```json
  {
    "event": "challenge.completed",
    "delivery_id": "uuid",
    "data": { /* same shape sync-to-academy posts today */ }
  }
  ```
  For `challenge.completed`, `data` is forwarded as-is to `sync-challenge-completion`. Other event types are recorded only until handlers ship.
- **Rollout (shadow → strict):**
  1. Academy stays in `unsigned` mode (current state). Play implements signing and starts sending `X-Play-Signature`.
  2. Academy sets `PLAY_WEBHOOK_SECRET` and runs in `lenient` mode — verifies, logs mismatches in `play_sync_attempts.request.sig_mode`, still accepts.
  3. After 48h of clean matches in lenient mode, Academy flips `PLAY_WEBHOOK_STRICT=true`. Mismatches then return `401`.
- **Verification reference (TS, matches receiver):**
  ```ts
  const sig = hex(hmacSha256(secret, rawBody));
  // header: X-Play-Signature: <sig>
  ```

Confirm receipt and we'll coordinate the secret handoff + dispatch-side implementation timing.

## Heads-up (not a blocker)

OSHA challenges don't have work orders in your prod feed — we seeded **4 stub work orders** on Academy mapped to those challenge IDs to enable the smoke test. If you ever publish real OSHA work orders on play with the same `source_challenge_id`s:

- `452f8199…`
- `7c7ae072…`
- `bcb4a446…`
- `d098fcac…`

…our seeded rows will collide on the unique index. **Ping us before you do** and we'll swap them out.
