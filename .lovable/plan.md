# Plan: Ship Play `achievement.earned` → Skill Passport

## Goal
Wire Play's `achievement.earned` webhook (and the `play-poll-achievements` fallback) all the way through to a **`skill_credentials`** row on the user's Skill Passport. After this lands, Play badges show up on `/profile`, `/passport/:slug`, and the public passport without any further coordination.

## Why this is the right next step
Academy is the hub. Play already pushes challenge completions; achievements are the other half of "what Play tells us a learner did." Once this lands, Play is end-to-end through Academy's SSOT — and the same write helper becomes the template the next source (broadbandworkforce.com) plugs into.

## Where the write lands

`skill_credentials` is the SSOT (not `user_achievements` — that table is Academy-internal gamification triggered by local actions). New row shape:

| Column | Value |
|---|---|
| `passport_id` | upsert of `skill_passport` for the resolved `user_id` |
| `credential_type` | `'badge'` |
| `credential_type_key` | `'play_achievement'` (new row in `credential_types`, `issuer_app_slug='play'`) |
| `issuer` | `'play.fgn.gg'` |
| `issuer_app_slug` | `'play'` (new `authorized_apps` row, `can_issue_credentials=true`) |
| `source` | `'external_api'` |
| `external_reference_id` | Play achievement id (idempotency key) |
| `title` | achievement name |
| `skills_verified` | from achievement payload if present, else `[]` |
| `xp_earned` | Play's `xp_reward` (or 0) |
| `game_title` | resolved from achievement → `game_id` lookup |
| `metadata` | full Play payload + `{ external_user_id, awarded_at, sig_mode, delivery_id }` |
| `verification_hash` | sha256 of `(issuer_app_slug, external_reference_id, passport_id)` |

Unique on `(issuer_app_slug, external_reference_id)` — added by migration so re-deliveries no-op cleanly.

## Identity resolution (shared helper)
Same precedence everywhere we ingest external events:
1. `play_identity.external_user_id` → `user_id` (fast path)
2. `auth.users.email` (case-insensitive) via `get_user_id_by_email` RPC → upsert `play_identity` for next time
3. No match → record in `play_sync_attempts` with `status='failed'`, `error='unmapped_identity'`, return `202` (don't 4xx; Play shouldn't retry our user-mapping problem)

This same helper gets pulled into `sync-challenge-completion` so behavior is consistent. (Refactor only if it slots in cleanly; otherwise keep it inline first, extract later.)

## Webhook contract (already defined in §6 of `phase-f-status-and-open-asks.md`)
Stays unchanged. `achievement.earned` event envelope:
```json
{
  "event": "achievement.earned",
  "delivery_id": "uuid",
  "data": {
    "achievement_id": "uuid",
    "name": "string",
    "description": "string",
    "xp_reward": 100,
    "skills_verified": ["string"],
    "game_id": "uuid|null",
    "icon_url": "string|null",
    "earned_at": "iso8601",
    "user": { "external_user_id": "uuid", "email": "string" },
    "tenant": { "id": "uuid|null", "slug": "string|null" }
  }
}
```
Fields we don't get yet → recorded in `metadata`, surfaced as gaps in the admin view. Confirmation goes in the Play asks doc; we don't block on it.

## Source auth (per-source HMAC under shared key)
- Keep `ECOSYSTEM_API_KEY` as the shared ingress key (header `X-Ecosystem-Key`).
- Add **per-source** HMAC secret: `PLAY_WEBHOOK_SECRET` exists; future sources get `BBW_WEBHOOK_SECRET`, etc.
- The receiver picks the secret by inspecting `X-Ecosystem-App` header (`play-webhook`, `bbw-webhook`, …). Unknown app → 401.
- This is a tiny lift on top of the existing verifier in `play-webhook-receiver` — we're just generalizing the secret lookup, not redesigning. No multi-source receiver yet — that comes the day broadband signs up.

## Build steps

1. **Migration** — adds:
   - `credential_types` row: `play_achievement` (issuer_app_slug=`play`)
   - `authorized_apps` row: slug `play`, `can_issue_credentials=true`, `can_read_credentials=false`
   - Unique index `skill_credentials_external_ref_unique` on `(issuer_app_slug, external_reference_id) WHERE external_reference_id IS NOT NULL`
   - Service-role INSERT policy on `skill_credentials` (currently only user/admin paths)

2. **`play-webhook-receiver`** — replace the `achievement.earned` "handler pending" branch with:
   - Resolve identity (helper above)
   - Ensure `skill_passport` exists for user (insert if missing)
   - Insert `skill_credentials` (ON CONFLICT DO NOTHING on the new unique index → mark attempt `duplicate`)
   - Update `play_sync_attempts.response` with `{ credential_id, was_new }`
   - Generalize HMAC secret lookup by `X-Ecosystem-App` (still defaults to `PLAY_WEBHOOK_SECRET`)

3. **`play-poll-achievements`** — replace the TODO with the same insert helper, so manual/scheduled polls and webhook deliveries converge on the same write. Updates `play_poll_cursor`.

4. **Smoke test** — fire a synthetic `achievement.earned` for darcy@fgn.gg via curl:
   - 1st call → 200, new credential row, visible on `/profile`
   - 2nd call (same delivery_id) → 200 `{ duplicate: true }`, no second row
   - 3rd call (new delivery_id, same `achievement_id`) → 200 `{ duplicate: true, reason: 'external_ref_exists' }`
   - Bad `external_user_id` + unknown email → 202 with `unmapped_identity` in `play_sync_attempts`

5. **Admin surface (small)** — add a "Play Achievements" tab inside the existing integrations admin showing the last 50 `play_sync_attempts` rows where `action='webhook:achievement.earned'`, with status, user, and error. (Full unified ingestion view is a separate plan.)

## Out of scope (intentionally)
- Unified `ecosystem_sync_attempts` refactor — defer until broadband forces it.
- Cross-source admin timeline UI — separate plan once we have ≥2 sources writing.
- Outbound credential push from Academy → Play — not needed for the hub model.
- Wiring achievements into Academy's local `user_achievements` triggers — Play badges live on the passport, not in Academy's gamification engine.

## Open asks the Play team needs to confirm (non-blocking; we ship with sensible defaults and adjust)
- Final field names on the `achievement.earned` payload (we'll log surprises).
- Whether `game_id` comes through as Play's UUID and how it maps to our `game_title` enum.
- `external_attempt_id` / `delivery_id` stability across retries (still open from §3 of the status doc).
