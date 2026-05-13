# Play → Academy: Webhook HMAC Contract (Phase E)

**From:** FGN Academy (`vfzjfkcwromssjnlrhoo`)
**To:** play.fgn.gg dev team
**Date:** 2026-05-13
**Status:** Final on Academy side — receiver deployed, lenient mode, awaiting strict-flip green light.
**Supersedes:** plan v3 §3 ask #5 (now resolved). Mirrors `docs/phase-f-status-and-open-asks.md` §6 for standalone distribution.

---

## TL;DR

Receiver is **live and lenient**. Send us your signed envelope at the URL below using the scheme in §3. We log every signature mismatch but still accept the body during the parity window. On **2026-05-26 16:00 UTC** we flip `PLAY_WEBHOOK_STRICT=true` and mismatches return `401`.

We need 4 things back from you (see §8). Everything else on this page is the contract — copy/implement as-is.

---

## 1. Transport

- **Method:** `POST`
- **URL:** `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/play-webhook-receiver`
- **Content-Type:** `application/json; charset=utf-8`
- **TLS:** required. No plaintext, no self-signed.
- **Timeout:** budget 10s end-to-end. We respond ≤ 2s p95 in lenient mode, ≤ 5s p95 once strict (credential-insert path).
- **Retries:** your call. We are idempotent on `delivery_id` (see §5). Safe to retry on any 5xx or network error.

## 2. Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `X-Play-Signature` | yes (strict) | `hex(hmac_sha256(PLAY_WEBHOOK_SECRET, rawBody))` — lowercase, 64 chars, no `sha256=` prefix |
| `X-Ecosystem-App` | recommended | `play-webhook` (drives per-source secret lookup; defaults to play if absent) |
| `X-FGN-Event` | recommended | canonical event name, e.g. `challenge_completion`, `achievement_earned`, `evidence_approved`. Envelope `event_type` wins if both present. |
| `X-Delivery-Id` | recommended | UUID, idempotency key. We also accept `X-Play-Delivery-Id` and the `delivery_id` field inside the envelope/payload. |
| `X-Play-Event` | optional | legacy alias of `X-FGN-Event`, still accepted. |

## 3. Signing

- **Algorithm:** HMAC-SHA256
- **Secret:** `PLAY_WEBHOOK_SECRET` — shared env var, distinct from `ECOSYSTEM_API_KEY`. Rotated via OneTimeSecret on 2026-05-10.
- **Signed bytes:** the **raw request body, exactly as sent**. No JSON re-serialization, no whitespace normalization, no trailing newline added or stripped.
- **Encoding:** lowercase hex, 64 chars, no prefix.
- **Header:** `X-Play-Signature: <hex>`
- **Comparison:** constant-time on our side (`timingSafeEqual`).

### Reference — Deno (matches our verifier)

```ts
const enc = new TextEncoder();
const key = await crypto.subtle.importKey(
  'raw', enc.encode(PLAY_WEBHOOK_SECRET),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
);
const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
const hex = Array.from(new Uint8Array(sig))
  .map(b => b.toString(16).padStart(2, '0')).join('');

await fetch(URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Play-Signature': hex,
    'X-FGN-Event': envelope.event_type,
    'X-Delivery-Id': envelope.payload.delivery_id,
    'X-Ecosystem-App': 'play-webhook',
  },
  body: rawBody,
});
```

### Reference — Node 18+

```js
import { createHmac } from 'node:crypto';
const rawBody = JSON.stringify(envelope); // sign EXACTLY what you send
const sig = createHmac('sha256', process.env.PLAY_WEBHOOK_SECRET)
  .update(rawBody).digest('hex');
await fetch(URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Play-Signature': sig,
    'X-FGN-Event': envelope.event_type,
    'X-Delivery-Id': envelope.payload.delivery_id,
    'X-Ecosystem-App': 'play-webhook',
  },
  body: rawBody,
});
```

## 4. Envelope

Single shape for every event:

```json
{
  "event_type": "challenge_completion",
  "payload":    { /* event-specific payload, see §6 */ },
  "timestamp":  "2026-05-13T16:00:00.000Z"
}
```

- `event_type` — canonical or legacy alias (we normalize). Aliases live: `challenge_completion → challenge.completed`, `achievement_earned → achievement.earned`, `evidence_approved → evidence.approved`.
- `payload` — flat per-event payload. We forward as-is to the inner handler.
- `timestamp` — ISO-8601 UTC, dispatch time.

## 5. Idempotency

- We dedupe on `(event_type, delivery_id)` against `play_sync_attempts.external_attempt_id`.
- Lookup order for `delivery_id`:
  1. envelope top-level `delivery_id`
  2. `payload.delivery_id`
  3. `payload.metadata.delivery_id`
  4. `X-Delivery-Id` header
  5. `X-Play-Delivery-Id` header
- If we've seen the key, we return `200 { duplicate: true, attempt_id, status }` without re-running the handler.
- Without a `delivery_id` we still accept the event but cannot dedupe — retries will create duplicate attempts (credential insert remains idempotent via unique index, but `play_sync_attempts` will show extra rows).

**Strongly recommend:** populate `delivery_id` on every dispatch.

## 6. Event payloads

### 6.1 `challenge_completion` (= `challenge.completed`)

Forwarded as-is to `sync-challenge-completion`. Canonical contract lives in your `docs/play-fgn-gg-integration-guide.md` §7. Required-on-Academy fields:

```json
{
  "event_type": "challenge_completion",
  "payload": {
    "delivery_id": "uuid",
    "challenge_id": "uuid",
    "external_attempt_id": "uuid",
    "completed_at": "2026-05-13T16:00:00.000Z",
    "score": 100,
    "user": { "external_user_id": "uuid", "email": "user@example.com" },
    "metadata": {
      "delivery_id": "uuid",
      "external_user_id": "uuid",
      "awarded_points": 20,
      "max_points": 20,
      "tenant_id": "uuid",
      "tenant_slug": "acme-broadband",
      "tenant_name": "Acme Broadband"
    },
    "skills_verified": ["fiber:splicing", "difficulty:intermediate"]
  },
  "timestamp": "2026-05-13T16:00:00.001Z"
}
```

### 6.2 `achievement_earned` (= `achievement.earned`)

Handled inline by receiver. Inserts a `play_achievement` (badge) credential keyed on `(passport_id, achievement_id)`.

```json
{
  "event_type": "achievement_earned",
  "payload": {
    "delivery_id": "uuid",
    "achievement_id": "uuid",
    "name": "First Splice",
    "earned_at": "2026-05-13T16:00:00.000Z",
    "xp_reward": 50,
    "skills_verified": ["fiber:splicing"],
    "user": { "external_user_id": "uuid", "email": "user@example.com" },
    "tenant": { "id": "uuid", "slug": "acme-broadband", "name": "Acme Broadband" }
  },
  "timestamp": "2026-05-13T16:00:00.001Z"
}
```

### 6.3 `evidence_approved` (= `evidence.approved`) — NEW, shipped 2026-05-12

Handled inline by receiver. Inserts a `play_evidence` (skill_verification) credential keyed on `(passport_id, evidence_id)`. Mirrors the achievement path; payload fields are best-effort tolerant.

```json
{
  "event_type": "evidence_approved",
  "payload": {
    "delivery_id": "uuid",
    "evidence_id": "uuid",
    "work_order_id": "uuid",
    "work_order_title": "OSP Drop Install — 123 Main",
    "skill": "fiber:installation",
    "skills_verified": ["fiber:installation", "difficulty:intermediate"],
    "score": 92,
    "xp_reward": 75,
    "approved_at": "2026-05-13T16:00:00.000Z",
    "reviewer": { "id": "uuid", "name": "J. Reviewer", "email": "reviewer@play.fgn.gg" },
    "user": { "external_user_id": "uuid", "email": "user@example.com" },
    "tenant": { "id": "uuid", "slug": "acme-broadband", "name": "Acme Broadband" }
  },
  "timestamp": "2026-05-13T16:00:00.001Z"
}
```

Field tolerance:
- `evidence_id` required. We also accept `id` as fallback.
- `skills_verified` preferred (array). If absent we fall back to `[skill]` or `[skill_key]`.
- `title` resolves from `work_order_title` → `title` → `"Verified: <skill>"` → `"Play Evidence Verified"`.
- `score`, `xp_reward`, `approved_at`, `reviewer`, `tenant` all optional.

## 7. Failure modes & responses

| Status | Body shape | Meaning | Action |
|---|---|---|---|
| `200 { ok: true, attempt_id, event, sig_mode, dispatch_status }` | success | accepted + dispatched | none |
| `200 { duplicate: true, attempt_id, status }` | dedupe hit on `delivery_id` | already processed | none |
| `200 { credentialed: true, duplicate: true, credential_id }` | credential already issued (achievement/evidence) | idempotent re-fire | none |
| `202 { credentialed: false, reason: "unmapped_identity", external_user_id, email }` | identity not resolvable | user has no `play_identity` row and email not in `auth.users` | retry after user signs up / links account |
| `400 { error: "unsupported event", event }` | event_type not in {challenge.completed, achievement.earned, evidence.approved} | typo or new event | check envelope `event_type` |
| `400 { error: "missing achievement_id" \| "missing evidence_id" }` | required external ref absent | payload bug | fix and resend |
| `400 { error: "invalid json" }` | body not parseable | encoding bug | fix and resend |
| `401 { error: "invalid signature", detail }` | (strict only) HMAC mismatch | wrong secret, wrong body bytes, wrong header | rotate / re-sign |
| `405` | non-POST | wrong method | use POST |
| `500 { error: "dispatch failed" \| "credential insert failed", detail }` | downstream error | infra/db issue on our side | safe to retry; we're alerting on these |

In **lenient** mode (current), signature mismatches log to `play_sync_attempts.request.sig_mode='lenient'` with the diagnostic `reason` string, body still processes, response is `200`. Use this window to land your signing.

## 8. Cutover schedule

| Date (UTC) | What changes |
|---|---|
| **2026-05-12 16:00** ✅ | T0 — Academy outbound sends `X-Ecosystem-Key`. Inbound accepts both `X-App-Key` (legacy) and `X-Ecosystem-Key`. Receiver lenient. |
| **2026-05-12 → 2026-05-14 ~16:22** | Phase 1 parity watch. Internal Parity Monitor dashboard polling 60s. Green-target = zero sig mismatches in 6h rolling window, dispatch parity ≥ 99.5%. |
| **2026-05-26 16:00** | T0+14d hard cutover. `PLAY_WEBHOOK_STRICT=true`. `X-App-Key` accept branches dropped on every inbound surface. Mismatched/missing signatures → `401`. |

Both flips are env-flag gated on our side — instant rollback if you regress, no redeploy.

## 9. Asks back to Academy (open)

These are blocking strict-flip if not resolved by 2026-05-26:

1. **Confirm `delivery_id` is populated on every dispatch** (top-level + `metadata.delivery_id` + `X-Delivery-Id` header). Validated on the 2026-05-12 02:54 UTC re-fire — please confirm it sticks for `achievement_earned` and `evidence_approved` too.
2. **Direct-POST repoint** — direct path is still hitting `https://fgn.academy/api/ecosystem/challenge-completed` which is a Vite SPA black-hole (200 OK, body discarded). Repoint to `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion` or drop the direct path now that dispatch is primary.
3. **Sample `evidence_approved` firing** — receiver is live and tested with synthetic payloads, but we have zero production firings in `play_sync_attempts` yet. Please send one (any tenant) so we can validate end-to-end credential issuance under your real envelope.
4. **HMAC sample request** — one signed request with the rotated `PLAY_WEBHOOK_SECRET` against a staging payload, so we can byte-diff the signed bytes before strict-flip. Curl dump or a `play_sync_attempts` row id is fine.

---

**Contact:** reply on the Phase E thread or ping in `#fgn-ecosystem-eng`. For incidents during the parity window, page Academy on-call (rotation in shared runbook).
