# Academy ↔ play.fgn.gg Integration — Plan v3 (post-source-of-truth review)

Reviewed `docs/fgn-academy-integration.md`, `ecosystem-data-api/index.ts`, and `sync-to-academy/index.ts` on the play side. This plan reflects play's **actual** contract (and their in-flight PRs P-1…P-6), not my v1/v2 inferences.

---

## 0. Reconciliation summary (what changed since v2)

| v2 assumption | Truth on play side | Impact |
|---|---|---|
| Their `/tenants` is a standalone endpoint | All actions dispatch through `POST ecosystem-data-api` with `{action:"tenants"}` | Our proxy posts to one URL with action body, not a new endpoint |
| Auth header is `X-App-Key` | Inbound to play uses **`X-Ecosystem-Key`**; outbound from play to us uses `X-App-Key` today, **`X-Ecosystem-Key` being added** in PR P-2 | Two different keys, two different headers, two different secrets |
| Canonical URL was unclear (`yrhwzmken…` vs `ragxkftma…`) | **`yrhwzmkenjgiujhofucx.supabase.co`** confirmed in their integration doc + active code | Delete the `ragxkftma…` ref in our `health-check-play` |
| `PlayChallenge` has `cdl_domain` / `cfr_reference` / `coach_context` / `cover_image_prompt` | Real `challenges` payload: `id, name, description, game_id, challenge_type, difficulty, points_reward, estimated_minutes, start_date, end_date, requires_evidence, cover_image_url, tasks[]`. Plus `academy_next_step_url` / `academy_next_step_label` on the sync push only. | "Lossless `play_source` import" shrinks to the actual field list |
| Score uses `metadata.awarded_points/max_points` already as fallback | Today: `score = round(awarded/points_reward*100)`. PR P-1 moves the canonical to `metadata.awarded_points` / `metadata.max_points` | Promotion plan unchanged — just confirmed |
| `tenant_id` already in payload | Not yet — PR P-3 adds `metadata.tenant_id`, `metadata.tenant_slug`, `metadata.tenant_name` | Our consumer needs to read all three |
| Per-tenant `api_url` override might exist | Today honored via `tenant_integrations.additional_config.api_url`; PR P-4 removes it and hardcodes `https://fgn.academy/api/ecosystem/challenge-completed` | Nothing to do on our side; just don't break that endpoint contract |
| Push is hypothetical | `ecosystem_webhooks` + `ecosystem-webhook-dispatch` already exist; we just register Academy as a subscriber | Turnkey win once we expose a receiver |

---

## 1. New surface area on the Academy side

### 1.1 Schema (one migration)
- `tenants.play_tenant_id uuid null` + partial unique index `(play_tenant_id) where play_tenant_id is not null`
- `tenants.play_synced_at timestamptz null`
- New table `play_identity`:
  - `user_id uuid pk → profiles.id`
  - `external_user_id uuid unique` (play's auth user id)
  - `email text`
  - `linked_at timestamptz default now()`
  - `last_seen_at timestamptz`
  - RLS: user reads own row; admins read all; service role writes
- New table `play_sync_attempts` (mirror of Breakroom pattern):
  - `id uuid pk`, `direction enum('inbound','outbound')`, `action text`, `external_attempt_id text null`, `status enum('queued','completed','failed','duplicate')`, `request jsonb`, `response jsonb`, `error text`, `created_at timestamptz default now()`
  - Unique partial index on `(action, external_attempt_id)` where `external_attempt_id is not null` — this is our idempotency key
- New table `play_poll_cursor`:
  - `action text pk` (e.g. `'challenges'`, `'achievements'`)
  - `since timestamptz`
  - `updated_at timestamptz`

### 1.2 Secrets
- Keep `FGN_PLAY_SUPABASE_URL` and `FGN_PLAY_SUPABASE_ANON_KEY` (already set).
- **Add** `ECOSYSTEM_API_KEY` — the shared key that goes in the `X-Ecosystem-Key` header for outbound calls *to* play, and that play will start sending in `X-Ecosystem-Key` *to* us in PR P-2. (Single shared secret, both directions.)
- Deprecate `PLAY_FGN_ANON_KEY` after migration.

### 1.3 Edge function patches

**`fetch-challenges`** → rewrite to a thin POST to `ecosystem-data-api`:
- Reads `FGN_PLAY_SUPABASE_URL` + sends `X-Ecosystem-Key: $ECOSYSTEM_API_KEY` + `X-Ecosystem-App: academy`
- Body: `{ action: 'challenges', since: <play_poll_cursor.since>, limit: 500 }`
- Persists `play_source` blob on `work_orders.metadata` containing the *actual* available fields (no fictional ones)
- Updates `play_poll_cursor` on success
- Pagination loop until empty page
- Drops the hardcoded `yrhwzmken…` URL in favour of env

**`health-check-play`** → also routes through `ecosystem-data-api` with `{action:'health'}`; surfaces play's `services.academy_key_configured` flag in its own response. Drops the `ragxkftma…` URL.

**`sync-challenge-completion`** → the bulk of the work:
- Accept either `X-App-Key` (legacy) **or** `X-Ecosystem-Key` (new) during transition window. Both validate against `ECOSYSTEM_API_KEY`. Log which header was used in `play_sync_attempts.request`.
- Promote scoring: prefer `metadata.awarded_points / metadata.max_points` → `round(*100)`. Fall back to `score`. Warn if both present and disagree by >1pt.
- Tenant routing using `metadata.tenant_id`:
  - Mapped → stamp `academy_tenant_id` on the completion + credential rows; if user's profile has no tenant, set it.
  - Unmapped UUID present → bucket as `unaffiliated`, log `metadata.tenant_id_play` raw, audit-warn.
  - Null → process untagged, audit-info.
- Identity: upsert `play_identity` from `(metadata.external_user_id, user_email)`; resolve user via `external_user_id` first (when known), fallback to email.
- Idempotency: insert into `play_sync_attempts` with `external_attempt_id` (from `metadata.external_attempt_id` if play sends one — see §3 ask). On duplicate → return `200 { duplicate: true }` without re-crediting XP.
- Replace hardcoded TRACK3/TRACK4 UUID arrays + `CE_COURSE_ID` + `TRACK3_LESSON_ID` with lookups against a new `challenge_track_membership` table (separate concern, but bundle here since we're already touching this function).

**New function `play-tenants-list`** (admin-gated):
- POST to `ecosystem-data-api` `{action:'tenants'}`
- Returns play's tenant list to the admin UI for the picker

**New function `play-poll-achievements`** (admin trigger or scheduled, P2 phase):
- POST `{action:'achievements', since: <cursor>}` → write play badges to user's Skill Passport as `external_credential` rows

### 1.4 Admin UI
- New page `src/pages/admin/PlayCommunities.tsx` (or tab inside `/admin/integrations`)
- Lists play tenants from `play-tenants-list`, greys out non-active
- Each row → combobox of local tenants → persists `play_tenant_id`
- Drift indicator using `play_synced_at`
- Manual "Re-sync this completion" admin action (matches play's PR P-5 admin-only re-sync)

### 1.5 Receiver endpoint for play's webhook dispatcher (P2 phase)
- New function `play-webhook-receiver` exposing `POST /functions/v1/play-webhook-receiver`
- Accepts `challenge.completed`, `evidence.approved`, `achievement.earned`
- Validates HMAC signature using a shared webhook secret (separate from `ECOSYSTEM_API_KEY`)
- Writes to `play_sync_attempts` + dispatches to existing handlers
- Once live, ask play to register us in their Admin → Ecosystem → Outbound Webhooks

---

## 2. Build order (matches play's PR cadence)

| Phase | Academy work | Triggered by |
|---|---|---|
| **A. Now (no play changes needed)** | Migrations §1.1, secrets §1.2, `health-check-play` switch to `ecosystem-data-api`, lossless `play_source` import in `fetch-challenges`, drop `ragxkftma…` URL | Independent |
| **B. When play PR P-1 ships** | Promote `metadata.awarded_points/max_points` to primary in `sync-challenge-completion` | Score-semantics change is live |
| **C. When play PR P-2 ships** | Accept `X-Ecosystem-Key` in `sync-challenge-completion` alongside legacy `X-App-Key` | Outbound auth header change |
| **D. When play PR P-3 ships** | Wire tenant routing in `sync-challenge-completion`; ship Community Picker UI; expose `play-tenants-list` | Tenant context arrives in payloads + `tenants` action available |
| **E. P2 — joint** | Webhook receiver + register Academy in their Outbound Webhooks; achievements poll | Round-trip push enabled |
| **F. P2 — Academy-internal** | Replace TRACK3/TRACK4 hardcoded UUIDs with `challenge_track_membership` table + admin editor | Independent |

Phase A can land *today*. B–D queue behind their merges; we deploy as soon as their PRs are live (you ping us, we deploy). E–F follow.

---

## 3. Asks back to the play team (short list, durable for chat record)

1. **Identity key**: confirm `metadata.external_user_id` is the canonical play user UUID and is included on every sync push. (We'll key our `play_identity` table on it.)
2. **Idempotency**: please add `metadata.external_attempt_id` (per-attempt UUID, stable across retries). Without it we can't safely de-dupe re-sends.
3. **Webhook signing**: when we stand up the receiver, what HMAC scheme will `ecosystem-webhook-dispatch` use? (Header name + canonical string format.)
4. **`tenants` action shape**: confirm fields will be `{ id, name, slug, logo_url, status }` so our picker types match.
5. **Rollout window for P-2**: how long do we keep `X-App-Key` accepted alongside `X-Ecosystem-Key` before we hard-fail legacy? Suggest 14 days.
6. **Receiver registration**: once we ship `play-webhook-receiver`, who registers it on your side and which event types do we get to opt into individually?

---

## 4. Security / RLS notes

- `play_identity`: user reads own; admins read all; only service role writes.
- `play_sync_attempts`: admins read all; service role writes; no user access.
- `tenants.play_tenant_id`: writeable only by `admin` / `super_admin` (extends existing tenant policies).
- New shared secret `ECOSYSTEM_API_KEY` stays server-side only.
- HMAC webhook secret (P2) added when we wire the receiver.

---

## 5. What this plan deliberately does NOT include

- **Pulling `quests`, `tournaments`, `tenant-events`, `season-stats`** — available on their API but no Academy surface needs them yet. Defer to a follow-up scoping pass.
- **OAuth-grade identity federation** — `play_identity` is a lookup table, not an SSO bridge. If you want full SSO between play and academy, that's a separate plan.
- **Outbound Academy → play webhook for credential issuance** — useful but not requested in this round; can be a phase G.

---

This is the plan I'd implement. Approve to kick off Phase A (migrations + secrets + health-check + `fetch-challenges` cleanup), and we'll queue B–D against their PR merges.
