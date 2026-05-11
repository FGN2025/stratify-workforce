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

## 8. Still open — PR P-2 legacy window

Re-flagging the one remaining ask, unchanged from §11 / plan v3:

- **PR P-2:** how long do we accept both `X-App-Key` and `X-Ecosystem-Key` before hard-failing legacy? Academy proposes **14 days** from cutover so we can schedule the strict-mode flip with confidence. Need play's confirm (or counter).

(Webhook HMAC scheme is **not** re-asked — finalized in §6, confirmed 2026-05-10.)

