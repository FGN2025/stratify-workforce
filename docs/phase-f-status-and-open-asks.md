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
5. ~~**Webhook HMAC scheme**~~ — **resolved.** Final contract confirmed by play 2026-05-10, see §6.

## 6. Webhook HMAC contract (FINAL — confirmed by play 2026-05-10)

Play's dispatcher is wired and `PLAY_WEBHOOK_SECRET` is rotating via OneTimeSecret. The earlier hex string is burned — wait for the new one before flipping to lenient. Academy's `play-webhook-receiver` already accepts play's final envelope.

- **Receiver URL:** `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/play-webhook-receiver`
- **Signature header:** `X-Play-Signature` — HMAC-SHA256, lowercase hex (64 chars), no prefix.
- **Signed bytes:** the **raw request body, exactly as sent** (no normalization, no re-serialization).
- **Companion event header:** `X-FGN-Event: challenge_completion` (legacy `X-Play-Event` still accepted; envelope `event_type` field takes precedence).
- **Secret:** `PLAY_WEBHOOK_SECRET`, shared env var, distinct from `ECOSYSTEM_API_KEY`.
- **Envelope (final):**
  ```json
  {
    "event_type": "challenge_completion",
    "payload": { /* flat payload as previously posted to sync-challenge-completion */ },
    "timestamp": "2026-05-10T12:34:56.789Z"
  }
  ```
  Receiver normalizes `challenge_completion` → `challenge.completed` and forwards `payload` as-is to `sync-challenge-completion`. Aliases also live for `achievement_earned` and `evidence_approved`.
- **Verification (matches receiver):**
  ```ts
  const expected = hex(hmacSha256(PLAY_WEBHOOK_SECRET, rawBody));
  if (!timingSafeEqual(req.headers['x-play-signature'], expected)) reject(401);
  ```

### Rollout state (as of 2026-05-10)

1. ✅ Play: dispatcher + signing live, `PLAY_WEBHOOK_SECRET` set on play side.
2. ⏳ **Academy waiting on:** rotated `PLAY_WEBHOOK_SECRET` via OneTimeSecret + `ecosystem_webhooks` row inserted on play (`target_app=fgn_academy`, `event_type=challenge_completion`, our URL, `is_active=true`).
3. Secret loaded on academy → play flips `PHASE_E_ROUTING_MODE` `off` → `shadow` (dual-send). Receiver runs lenient: verifies, logs mismatches via `play_sync_attempts.request.sig_mode`, still accepts.
4. 24–48h of clean matches in shadow → play promotes dispatch to primary; direct POST stays as fallback.
5. 48h after that → academy flips `PLAY_WEBHOOK_STRICT=true`. Mismatches return 401.

Until step 2, dispatch is a no-op on play — direct POST to `sync-challenge-completion` carries 100% of traffic. Fully reversible at every step.

## Heads-up (not a blocker)

OSHA challenges don't have work orders in your prod feed — we seeded **4 stub work orders** on Academy mapped to those challenge IDs to enable the smoke test. If you ever publish real OSHA work orders on play with the same `source_challenge_id`s:

- `452f8199…`
- `7c7ae072…`
- `bcb4a446…`
- `d098fcac…`

…our seeded rows will collide on the unique index. **Ping us before you do** and we'll swap them out.

## 7. Update — skills taxonomy (v1, May 2026)

- **Source of truth:** Play's `src/lib/skillTaxonomy.ts`. Academy mirrors it via `skill_credentials.skills_verified[]` (accepts namespaced tags as-is) and `/public-catalog/skills` consumers.
- **Cross-reference:** Play's `docs/play-fgn-gg-integration-guide.md` §7 + "Skills Taxonomy (May 2026)" — that doc remains the canonical end-to-end `challenge_completion` payload spec.

### Full taxonomy snapshot (v1, May 2026)

#### `cdl:` — Commercial Driving (FMCSA 49 CFR 383)

| Tag | Label |
|-----|-------|
| `cdl:pre-trip` | Pre-Trip Inspection |
| `cdl:backing` | Backing & Parking |
| `cdl:speed-management` | Speed Management |
| `cdl:logbook` | Hours of Service / Logbook |
| `cdl:hazard-perception` | Hazard Perception |
| `cdl:fuel-mgmt` | Fuel Management |
| `cdl:cargo-securement` | Cargo Securement |
| `cdl:hazmat-awareness` | Hazmat Awareness |

#### `osha:` — Workplace Safety (OSHA 10/30)

| Tag | Label |
|-----|-------|
| `osha:fall-protection` | Fall Protection |
| `osha:ppe` | Personal Protective Equipment |
| `osha:lockout-tagout` | Lockout / Tagout |
| `osha:hazcom` | Hazard Communication |
| `osha:electrical-safety` | Electrical Safety |
| `osha:ladder-safety` | Ladder & Scaffold Safety |
| `osha:confined-space` | Confined Space Entry |

#### `fiber:` — Broadband Tech (OSP / ISP)

| Tag | Label |
|-----|-------|
| `fiber:splicing` | Fusion Splicing |
| `fiber:otdr` | OTDR Testing |
| `fiber:installation` | Installation & Drop |
| `fiber:troubleshooting` | Troubleshooting |
| `fiber:termination` | Connector Termination |
| `fiber:documentation` | As-Built Documentation |

#### `gaming:` — Transferable Esports Skills

| Tag | Label |
|-----|-------|
| `gaming:aim` | Aim & Mechanics |
| `gaming:strategy` | Strategy & Game Sense |
| `gaming:teamwork` | Teamwork & Communication |
| `gaming:macro` | Macro / Map Awareness |
| `gaming:micro` | Micro / Execution |
| `gaming:vod-review` | VOD Review & Adaptation |

### Difficulty (secondary metadata tag, always appended)

`difficulty:beginner` | `difficulty:intermediate` | `difficulty:advanced` | `difficulty:expert` — mirrors `challenges.difficulty`.

### Legacy fallback shape (untagged challenges only)

```json
"skills_verified": ["game:<games.name>", "gaming-proficiency", "difficulty:<level>"]
```

Emitted only when `challenges.skill_tags` is empty/null. Curated and legacy payloads coexist during rollout — no flag day.

### Format rules

- Lowercase, namespace-prefixed: `<namespace>:<skill>`.
- Skill Passport keys on the **prefix** so unknown skills in a known namespace fail open instead of being dropped.
- Edge function does not filter unknown tags — admins can introduce new ones ahead of taxonomy bumps.

### Academy-side impact

1. `skill_credentials.skills_verified[]` accepts namespaced tags as-is (no schema change).
2. Profile / Skill Passport renders `namespace:tag` via human-label lookup; falls back to title-cased tag for unknowns.
3. `/public-catalog/skills` stays game-scoped today. Adding a `namespace` field to the response is a planned follow-up PR (out of scope for v1 rollout).

## 8. PR P-2 legacy window — cutover dates LOCKED (Academy, 2026-05-11)

Academy is committing the dates so play can schedule the strict-mode flip without further coordination. Pulling these out of "open asks" — no further confirm needed.

- **T0 (cutover start):** **2026-05-12 16:00 UTC**. From T0, Academy outbound calls send `X-Ecosystem-Key` (new) on every request. Inbound: Academy accepts **both** `X-App-Key` (legacy) and `X-Ecosystem-Key` (new), and accepts both signed and unsigned bodies on the legacy direct-POST path.
- **Dual-key window:** **14 days** (T0 → T0+14d).
- **T0+14d (hard cutover):** **2026-05-26 16:00 UTC**. Academy drops `X-App-Key` acceptance on every inbound surface (`sync-challenge-completion`, `play-webhook-receiver`, `credential-api/passport-link`, `telemetry-ingest`) and stops accepting unsigned bodies on the webhook receiver (`PLAY_WEBHOOK_STRICT=true`). Mismatched/missing signatures return 401.
- **Rollback:** if play surfaces a regression in the dual-key window, Academy can extend by re-flipping `PLAY_WEBHOOK_STRICT=false` and re-enabling the `X-App-Key` accept branch — both are env-flag gated, no redeploy.

Phase E shadow flip is the only remaining external trigger gating this timeline — see §10.

## 10. Phase E shadow → live flip — Academy T0 ping (2026-05-11)

Per play's P0 status, Academy owes the T0 ping to flip `PHASE_E_ROUTING_MODE` `off → shadow`. Runbook is mirrored on play side (`docs/phase-e-shadow-to-live-runbook.md`). Academy-side checklist:

1. ✅ Receiver live, `PLAY_WEBHOOK_SECRET` loaded, lenient mode (`PLAY_WEBHOOK_STRICT=false`). Verified zero signed webhook traffic in `play_sync_attempts` over the last 48h — clean baseline.
2. ✅ §6 contract finalized; §9 magic-link relay shipped; §8 cutover dates locked above.
3. ✅ **T0 ping SENT (2026-05-11) — Play ACK received, shadow live.** First dispatched webhooks landed `2026-05-11 23:09:13.659 UTC` and `23:09:18.333 UTC` (`play_sync_attempts` ids `2cc8b893…` / `f6163815…`) for **CS - Bronze Challenge** (`external_attempt_id=dbd3fc50-60b0-4cba-aa18-06cb7cb93fd5`, RacerX/`darcy@fgn.gg`, tenant `acme-broadband`). Both dispatched in `sig_mode=lenient`, `status=completed`. **Parity window anchor T0_dispatch = 2026-05-11 23:09:13.659 UTC; close = 2026-05-13 23:09 UTC (48h).**
   - 🔬 **Flag 1 — Score 100→0 (Play counter-readout 2026-05-11):** Academy receiver dump confirms the two dispatched payloads are **NOT identical**. Dispatch #1 carries `payload.score=100`, `payload.metadata.awarded_points=20`, `payload.completed_at=2026-05-11T23:09:07.741Z`. Dispatch #2 carries `payload.score=0`, `payload.metadata.awarded_points=0`, `payload.completed_at=2026-05-11T23:09:14.001Z` — different `completed_at`. Receiver is not normalizing/clobbering — `sync-challenge-completion` faithfully wrote what it received (xp 20→0, status `completed`→`failed`, credential issued only on #1). **Root cause sits on Play:** the second `sync-to-academy` invocation rebuilt a different payload (different `completed_at` + different score). Likely Play's payload-builder ran against post-mutation completion state on the second call. Parity diff is a real payload divergence, not a receiver bug — needs Play to confirm whether `challenge_completions.status` was momentarily flipped to `failed`/score recomputed between the two outbound calls, or whether the second invocation came from a different code path with stale/zeroed scoring.
   - 🔬 **Flag 2 — Direct POST pairing (Play counter-readout 2026-05-11):** Play reports direct POSTs to `https://fgn.academy/api/ecosystem/challenge-completed` returned HTTP 200. **Confirmed black-hole on Academy side.** `fgn.academy` is a Vite SPA served by `nginx.conf` with `try_files $uri $uri/ /index.html` — there is no `/api/ecosystem/challenge-completed` route in the codebase, so the POST receives `index.html` with status 200 and is silently discarded. The only Academy receiver for direct play→academy traffic is the Edge Function `sync-challenge-completion` at `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion` (referenced in §6/§8). Play needs to repoint the direct path to that Edge Function URL (or drop the direct path entirely now that dispatch is live), otherwise the §3a parity SQL will keep showing dispatch-only rows and the "shadow expects both fire" assumption is unmeetable. **Action: Academy will not add the SPA route — direct path was always meant to be the Edge Function URL; Play to update target.**
   - ⚠️ **Flag 3 — Idempotency gap:** outer envelope `delivery_id` null on both firings; PR P-3 (top-level `delivery_id` + `X-Delivery-Id` header) acknowledged by Play, lands before T0+14d. Receiver-side change to honor the header is a one-line addition in `play-webhook-receiver` (already reads `x-play-delivery-id` as fallback) — will extend to `x-delivery-id` in lockstep.
4. **Parity window:** 24–48h. Pass thresholds (per runbook): zero signature mismatches in the last 6h rolling window, zero payload diffs on `metadata.tenant_*` / `metadata.external_user_id` / scoring fields, dispatch-status parity ≥ 99.5%, webhook-vs-direct latency p95 < 5s.
5. **Promotion:** play flips dispatch to primary; direct POST stays as fallback. Academy holds another 48h of clean primary traffic.
6. **Strict flip:** Academy sets `PLAY_WEBHOOK_STRICT=true`. This is bundled with the §8 T0+14d hard cutover (2026-05-26 16:00 UTC) **only if** primary has been clean for ≥ 48h by then. If not, strict flip slips and §8 hard cutover slips with it — Academy will re-ping play with the revised date.

Webhook HMAC scheme is **not** re-asked — finalized in §6, confirmed 2026-05-10.

## 9. P1 BLOCKER — Player Dashboard → Skill Passport URL contract

**Asked by:** play, 2026-05-11. **Status:** awaiting Academy decision. **Owner:** Academy.

Play wants to deep-link from the Player Dashboard tile straight into the user's Skill Passport on Academy. Need a stable, documented contract before play ships the link. Two options on the table — Academy picks one:

### Option A — Canonical public URL pattern

Publish a stable URL shape play can construct client-side. Academy must commit to:

- The path template (current public route is `/passport/:slug` where `:slug` = `skill_passport.public_url_slug`, gated by `is_public=true`). Slug is opaque, not derivable from `email` or `external_user_id`.
- Whether play should look up the slug via an Academy endpoint keyed on `email` or `external_user_id`, then build the URL — i.e. `GET /api/ecosystem/passport-slug?external_user_id=…` returning `{ slug, is_public }`.
- Behavior when `is_public=false`: 404, "request access" page, or fall through to option B.

**Pros:** simple, cacheable, no per-click round-trip. **Cons:** only works for users who've toggled their passport public. Doesn't preserve auth — viewer sees the public passport, not their authenticated owner view.

### Option B — Magic-link endpoint *(preferred by play, cheap on both sides)*

Play POSTs an HMAC-signed request; Academy mints a one-time URL.

- **Endpoint (proposed):** `POST https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport-link`
- **Auth:** `X-Ecosystem-Key` + `X-Play-Signature` (HMAC-SHA256 of raw body, same scheme as §6 webhook receiver — reuse `PLAY_WEBHOOK_SECRET` or mint a new `ECOSYSTEM_LINK_SECRET`, Academy's call).
- **Body:**
  ```json
  {
    "external_user_id": "<uuid from challenge_completion.metadata>",
    "intent": "view_passport",
    "ttl_seconds": 300
  }
  ```
- **Response:**
  ```json
  {
    "url": "https://fgn.academy/passport/link?token=<one-time-jwt>",
    "expires_at": "2026-05-11T12:39:00Z",
    "user_resolved": true
  }
  ```
- **Resolution:** Academy resolves `external_user_id` → `play_identity.user_id` → `profiles.id`. If unmatched, return `404 { error: "user_not_linked" }` so play can fall back to a "Connect your Academy account" CTA.
- **Landing page:** `/passport/link` consumes the token, sets/refreshes the Academy session if the viewer is signed in as the same user (owner view), otherwise redirects to the public `/passport/:slug` (if public) or a sign-in prompt. Token is single-use, 5-min TTL.

**Pros:** preserves Academy session/auth; works for private passports; no slug guessing; reuses `external_user_id` already flowing in `challenge_completion.metadata` (PR P-3); reuses the §6 HMAC primitives. **Cons:** one extra round-trip per click on play side, one new edge function route on Academy side.

### Recommendation

Academy should ship **Option B** and document Option A's `GET /passport-slug` lookup as a secondary read-only helper for embed/share cards. B is the only path that handles private passports and authenticated owner views without leaking slugs.

### Decision (Academy, 2026-05-11) — Option B, shipped

Academy picks **Option B** (HMAC magic-link relay) as the primary contract and **ships it now**. Option A `GET /passport-slug` is **not** implemented in this PR — re-open if you want it as a read-only helper for embed/share cards.

**Live endpoints (deployed):**

- `POST https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport-link`
  - Headers: `X-Ecosystem-Key: <ECOSYSTEM_API_KEY>`, `X-Play-Signature: <hex HMAC-SHA256(rawBody) using PLAY_WEBHOOK_SECRET>`, `Content-Type: application/json`.
  - Body: `{ "external_user_id": "<uuid>", "intent": "view_passport", "ttl_seconds": 300 }` (`ttl_seconds` clamped 60–900, default 300).
  - 200: `{ "url": "https://fgn.academy/passport/link?token=<opaque>", "expires_at": "...", "user_resolved": true }`.
  - 401 `invalid_ecosystem_key` / `invalid_signature`. 400 `missing_external_user_id` / `invalid_json`. 404 `user_not_linked`. 500 `server_not_configured` / `token_persist_failed`.
- `POST .../credential-api/passport-link/consume` — internal, called by the Academy landing page only. Body `{ token }`. Single-use; returns `{ user_id, intent, passport_slug, is_public }`. 410 on already-used / expired.
- Landing page: `https://fgn.academy/passport/link?token=…` — consumes token, then:
  - Owner view (viewer signed in as `user_id`) → `/profile`.
  - Public passport available → `/passport/:slug`.
  - Otherwise → `/auth?next=/profile`.

**Confirmed answers to play's open checkboxes:**

- [x] **Primary contract:** Option B.
- [x] **Secret:** **reuse `PLAY_WEBHOOK_SECRET`** (no new `ECOSYSTEM_LINK_SECRET`). Same scheme as §6 webhook receiver — lowercase hex HMAC-SHA256 over the **raw request body**, header `X-Play-Signature`. `X-Ecosystem-Key` carries `ECOSYSTEM_API_KEY` and is checked alongside the signature.
- [x] **Ship date:** **shipped 2026-05-11** behind the existing edge-function deploy. Safe to flip play's dashboard tile to live whenever you're ready — no Academy redeploy required.

**Storage / lifecycle:** tokens persist in `passport_link_tokens` (PK = token, indexed on `expires_at`). RLS denies all client access; only the edge function (service role) reads/writes. `purge_expired_passport_link_tokens()` drops rows older than 1 day past expiry — wire it to pg_cron whenever convenient.

**Note on play's `additional_config` knobs (per your §9 companion):** Academy is fine with you driving link-out from `tenant_integrations` config. To activate Option B on your side, set `passport_link_mode = "magic_link"` and `passport_magic_link_endpoint = "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport-link"`. Default 404 template can stay until you flip.

This unblocks the Player Dashboard ↔ Skill Passport tile. §8 (PR P-2 14-day window) is now the sole remaining open ask.

### Pre-strict-flip blocker (Play, 2026-05-11) — passport-link signature mismatch

Play surfaced a `401 invalid_signature` on the passport-link smoke test. Because `passport-link` and `play-webhook-receiver` share the **same HMAC primitive** (`PLAY_WEBHOOK_SECRET`, lowercase hex HMAC-SHA256 over raw body, header `X-Play-Signature`), any root cause here will also trip `PLAY_WEBHOOK_STRICT=true` on 2026-05-26.

**Owner:** joint (Play repros, Academy verifies receiver-side canonical bytes). **Must resolve before:** T0+14d strict flip (2026-05-26 16:00 UTC).

Likely root causes to rule out, in order:

1. **Body re-serialization on Play's side.** `JSON.stringify` after signing → bytes drift. Sign the exact `Uint8Array`/string you POST.
2. **Charset / BOM / trailing newline** in the raw body buffer.
3. **Secret drift** — confirm Play's `PLAY_WEBHOOK_SECRET` matches the rotated value Academy loaded (the pre-rotation hex is burned).
4. **Header casing / extra whitespace** on `X-Play-Signature` (receiver does `timingSafeEqual` on lowercase hex, no `sha256=` prefix).
5. **Encoding** — `hex` not `base64`, lowercase not uppercase.

Academy will mirror the receiver's canonical-bytes assertion into `passport-link` logs (`sig_mode` + `sig_reason`) so the next smoke test surfaces the same diagnostic the webhook receiver already does. If the mismatch reproduces under shadow on `play_sync_attempts.request.sig_reason`, fix lands once and clears both surfaces.

