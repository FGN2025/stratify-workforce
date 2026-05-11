# To: play.fgn.gg devs — Phase E shadow rollout, academy side ready

**Date:** 2026-05-11
**From:** fgn.academy
**Re:** Webhook dispatch (`PHASE_E_ROUTING_MODE`) — ready for `off → shadow` flip

---

## TL;DR

Academy side is fully wired and idle. We see **zero real webhook deliveries** in `play_sync_attempts` over the last 48h. Direct POST to `sync-challenge-completion` is still carrying 100% of traffic (4 success / 2 errors in the last 24h, all `action='challenge_completion'`, none with `action='webhook:challenge.completed'`). Whenever you flip `PHASE_E_ROUTING_MODE` from `off` to `shadow`, dual-send will start landing on our receiver and we can begin diffing.

No action required from us before you flip. This note is just a checkpoint so we're aligned on what's verified, what's pending, and what the success criteria look like.

---

## What's confirmed on the academy side

1. **Receiver live.** `play-webhook-receiver` is deployed at
   `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/play-webhook-receiver`
   and accepts your final envelope (`{ event_type, payload, timestamp }`), with
   `challenge_completion` aliased to canonical `challenge.completed`.
2. **`PLAY_WEBHOOK_SECRET` loaded.** Rotated value from your OneTimeSecret is
   installed as the receiver env var. The earlier hex string is burned and
   no longer accepted anywhere.
3. **Strict mode off.** `PLAY_WEBHOOK_STRICT=false`. Receiver runs lenient:
   verifies HMAC, logs `sig_mode` (`strict` / `lenient` / `unsigned`) into
   `play_sync_attempts.request.sig_mode`, but still 200s on mismatch so a
   bad signature can't take down the pipeline during shadow.
4. **Subscription row inserted on play.** Per your confirmation:
   ```sql
   target_app    = 'fgn_academy'
   event_type    = 'challenge_completion'
   webhook_url   = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/play-webhook-receiver'
   is_active     = true
   ```
5. **Idempotency keyed on `delivery_id`.** Duplicate `X-Play-Delivery-Id`
   for the same action returns the prior attempt instead of reprocessing.
6. **Forwarder unchanged.** `challenge.completed` still fans out to
   `sync-challenge-completion` with `X-Ecosystem-App: play-webhook` so the
   existing track/credential/notification logic is exercised end-to-end —
   no separate code path to keep in sync.

## What we're seeing right now

Query window: last 48h, `play_sync_attempts`.

| `action`                          | rows | `sig_mode` breakdown        |
|-----------------------------------|------|-----------------------------|
| `challenge_completion` (direct)   | 6    | n/a (direct POST)           |
| `webhook:challenge.completed`     | 1    | `unsigned`                  |
| `webhook:achievement.earned`      | 3    | `unsigned`                  |

All four `webhook:*` rows are pre-secret smoke traffic from us (sent before
`PLAY_WEBHOOK_SECRET` was loaded — that's why they're `unsigned`). **Zero**
webhook rows have landed since the secret was installed, which is the signal
that real dispatch hasn't fired yet.

Interpretation: subscription row exists, receiver is ready, secret matches —
the only remaining gate is `PHASE_E_ROUTING_MODE` on your side.

## What we're watching for once you flip to `shadow`

For each completion, we expect **two rows** in `play_sync_attempts` with the
same `external_attempt_id` (this is why ask #1 about `metadata.external_attempt_id`
matters — without it we fall back to best-effort matching on user + challenge + timestamp):

- Direct: `action='challenge_completion'`
- Webhook: `action='webhook:challenge.completed'`, `request.sig_mode='lenient'` or `'strict'`

We'll diff:

1. **Signature health.** `sig_mode='lenient'` with `request.sig_reason='signature mismatch'`
   means the secret or canonical-bytes contract drifted. Should be zero.
2. **Payload parity.** Inner payload from the webhook envelope should be
   byte-equal to the direct POST body for the same attempt. Any field drift
   (especially `metadata.tenant_*`, `metadata.external_user_id`, scoring
   fields) gets flagged.
3. **Dispatch outcome parity.** Both paths land in `sync-challenge-completion`,
   so `dispatch_status` on the webhook attempt should match the direct
   POST's HTTP status for the same completion. Divergence here means our
   forwarder is mangling something on the way through.
4. **Latency.** Webhook is expected to lag direct POST by a few hundred ms.
   If the gap is multiple seconds or webhooks arrive out of order with
   direct, we'll surface it before promoting.

## Promotion criteria (unchanged from §6 of `phase-f-status-and-open-asks.md`)

- **24–48h of clean shadow** (zero signature mismatches, zero payload diffs,
  zero dispatch-status divergence) → you promote dispatch to primary, direct
  POST stays as a fallback.
- **+48h clean as primary** → academy flips `PLAY_WEBHOOK_STRICT=true`.
  Mismatched signatures start returning 401 instead of being logged-and-accepted.

Fully reversible at every step. If anything looks off in shadow we just stay
in shadow longer; nothing user-visible changes until strict mode flips.

## Still-open asks (re-flag, no change)

These don't block the `off → shadow` flip but they shape how clean the shadow
diff will be. Pulled from `phase-f-status-and-open-asks.md` §3:

1. **`metadata.external_attempt_id`** — per-attempt UUID stable across retries.
   Without it our pairing of direct vs webhook rows is fuzzy.
2. **`metadata.external_user_id`** on every push (PR P-3).
3. **PR P-2 dual-key window** — we proposed 14 days of accepting both
   `X-App-Key` and `X-Ecosystem-Key` before hard-fail.
4. **PR P-3 tenant fields shape** — `metadata.tenant_id` (uuid),
   `metadata.tenant_slug`, `metadata.tenant_name`.

## Ask of you

Just one thing: **flip `PHASE_E_ROUTING_MODE` `off → shadow`** when you're
ready, and ping the thread. We'll watch `play_sync_attempts` for the first
signed `webhook:challenge.completed` row and confirm `sig_mode='lenient'`
with no mismatch reason. From there we run the 24–48h diff and report back.

If you'd rather trigger a couple of synthetic completions first to sanity-check
the signature path before opening real traffic, that works too — just let us
know and we'll watch for them specifically.
