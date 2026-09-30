# FGN Academy Integration Contract Inventory

**Inventory version:** `2026-10-01.1` (previous: `2026-09-30.1`)
**Source of truth:** deployed edge-function handlers and the live `learning_sources` registry, read 2026-09-30.
**Precedence:** where any other document disagrees with this file, this file wins. Guides must be updated to match — not the other way round.

Bump the version (`YYYY-MM-DD.N`) whenever a handler, header, envelope, credential rule or registry row listed here changes.

---

## 1. Surface inventory

| Surface | Direction | Mode | Auth | Status |
|---|---|---|---|---|
| `play-webhook-receiver` | Play → Academy | push | `X-Play-Signature` HMAC (secret chosen by `X-Ecosystem-App`, default `PLAY_WEBHOOK_SECRET`) | **Live — current Play path** |
| `learning-source-webhook` | any partner → Academy | push | `X-Learning-Source` + `X-Learning-Source-Signature` HMAC, per registry row | Live; no production partner cut over yet |
| `learning-source-pull-bbw` | Academy polls BBW | pull (scheduled, ~5 min) | Academy-held BBW service credentials | Live |
| `sync-challenge-completion` | Play / internal forward → Academy | push | `X-Ecosystem-Key` only | Live |
| `push-play-progress` | Academy → Play | push (outbound) | `X-Ecosystem-Key` + signature | Live |
| `webhook-dispatch` | Academy → subscribers | push (outbound) | `X-Webhook-Signature` HMAC per subscription | Internal trigger only (service role) |
| `credential-api` | partners ↔ Academy | request/response | none / Bearer JWT / `X-App-Key` | Live |
| `public-catalog` | anyone → Academy | read | none | Live |
| `studio-catalog` | FGN Studio → Academy | read | short-lived scoped Bearer token; `X-Studio-Contract` | Live, versioned separately (see `studio-catalog/README.md`) |

## 2. Registry state (live)

| slug | ingestion_mode | strict_mode | secret env | active |
|---|---|---|---|---|
| `play` | push | false | `PLAY_WEBHOOK_SECRET` | yes |
| `bbw` | pull | false | `BBW_WEBHOOK_SECRET` | yes |

Important behaviors confirmed in code:
- `ingestion_mode` is **enforced**: pushes to a `pull` source get `409 { error: "source_is_pull_only", slug }` and are logged as failed.
- The registry `strict_mode` governs only `learning-source-webhook`. Play traffic on `play-webhook-receiver` is governed by the `PLAY_WEBHOOK_STRICT` env var, which **defaults to strict** when unset. The `play` registry row's `strict_mode=false` does not loosen that receiver.
- If a **strict** source's secret env var is missing, `learning-source-webhook` returns `503 { error: "signing_secret_unconfigured" }` (fail closed, matching `play-webhook-receiver`). Non-strict sources stay lenient and are labelled `unsigned`.

## 3. Response envelopes (as deployed)

There is **no single platform envelope**. The earlier `{ "data": ..., "error": null }` claim was never implemented.

| Surface | Success | Error |
|---|---|---|
| Inbound webhooks (both receivers) | `200 { ok: true, attempt_id, source?, event, sig_mode, dispatch_status }` | `{ error: string, detail? }` with 400/401/404/405/500 |
| Inbound duplicate delivery | `200 { duplicate: true, attempt_id, status }` | — |
| BBW pull run | `200 { ok: true, processed, total, since, advanced_to, results }` | `{ error, detail? }` 404/500/502 |
| `sync-challenge-completion` | `200 { success: true, completion: {...}, task_progress, ... }` | `{ error, details? }` 400/401/404/500 |
| `credential-api` | `{ success: true, ... }` (resource fields inline, e.g. `credential`) | `{ error }` |
| `public-catalog`, `studio-catalog` | resource-specific; `studio-catalog` adds version fields | `{ error }` |

Note: inbound webhooks return HTTP **200** even when the inner dispatch returned 202 (unmapped identity) or failed; read `dispatch_status` for the real outcome. `unmapped_identity` is a 202 only at the handler level.

## 4. Credential processing (shared handlers)

| Event | `credential_type` | `credential_type_key` | Idempotency key |
|---|---|---|---|
| `achievement.earned` / `enrollment.completed` | `badge` | `<slug>_achievement` | `(passport_id, external_reference_id=achievement_id, credential_type_key)` |
| `evidence.approved` | **disabled** — `501 { error: "not_enabled" }` on both receivers; nothing issued | — | — |
| `challenge.completed` | — (forwarded to `sync-challenge-completion`) | set by that function | per-challenge completion logic |

Rules applied in code:
- Identity: `learning_source_identity` → email lookup → `unmapped_identity` (no credential).
- Skill tags are filtered by the source's `skill_tag_pattern`; non-matching tags are dropped (evidence path records them in metadata).
- `xp_earned` = payload `xp_reward` if numeric, else 0. `source='external_api'`, `issuer=display_name`, `verification_hash = sha256(slug|…|ref|passport)`.
- Forwarded `challenge.completed` authenticates with `X-Ecosystem-Key`, which `sync-challenge-completion` always attributes to app slug `fgn-play`, regardless of the originating source.

**Interim (decision 4 pending):** `evidence.approved` is refused with 501 while Skill Verification is dormant. Recommended long-term option: record approvals as partner evidence (Task Demonstration input) with no credential or XP until activation.

## 5. Replay and retry (consistent across sources)

- Unmatched learners are parked as `unmapped` (general receiver, BBW pull) or `unmapped_identity` (Play receiver).
- On sign-up, `enqueue_play_replay_on_signup` queues one retry intent per source (`play_replay_queue.source_slug`).
- `process-play-replay-queue` (every 2 min) re-fires Play attempts through the Play receiver and runs other sources through the shared credential handler. The unique credential index prevents duplicate credentials or XP.
- BBW cursor advances past `unmapped` rows without losing them; per-enrollment idempotency on `bbw:enrollment:<id>`.
- Not yet covered: `challenge.completed` forwarded through the general receiver for an unregistered learner (404 from `sync-challenge-completion`) is logged as failed, not queued.
- Retry is triggered by sign-up only. Linking a partner identity later does not trigger a retry.

## 6. Header status

| Header | Accepted by | Note |
|---|---|---|
| `X-App-Key` | `credential-api`, `studio-catalog` token exchange, `media-upload`, `scorm-publish` | Per-partner app key; required on these. **Retired on `sync-challenge-completion`** (401 names `X-Ecosystem-Key`). |
| `X-Ecosystem-Key` | `sync-challenge-completion`, outbound to Play | Shared `ECOSYSTEM_API_KEY` |
| `X-Delivery-Id` / `X-Play-Delivery-Id` / body `delivery_id` | both receivers | Idempotency |
| `X-FGN-Event` / `X-Play-Event` | `play-webhook-receiver` | Body `event_type` takes precedence |

## 7. Document status

| Document | Status |
|---|---|
| `integration-guides/inbound-learning-source.md` | Current; corrected to this inventory |
| `api/README.md` | Envelope section corrected |
| `play-to-academy-hmac-contract-ping.md` | Historical (Phase E); timeline statements superseded |
| `phase-f-status-and-open-asks.md` | Historical log; not a contract |
| `integration-guides/outbound-progress-to-play.md` | Current |
| `studio-catalog/README.md` + OpenAPI | Current; own contract version |

## 8. Decisions log

| # | Decision | Status |
|---|---|---|
| 1 | Reject pushes for pull-only sources (409) | Shipped 2026-10-01.1 |
| 2 | Fail closed when a strict source's secret is missing (503) | Shipped |
| 3 | Retire `X-App-Key` where not critical (challenge-completion only) | Shipped |
| 4 | `evidence.approved` vs dormant Skill Verification | Interim 501; owner choice pending |
| 5 | Consistent source-aware retry | Shipped (gaps listed in §5) |

## 9. Host aliases

Canonical base today: `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/<surface>`. Future `*.fgn.academy` hosts (e.g. `api.fgn.academy`) will be listed here only once DNS and routing resolve. Contract rules are host-independent.
