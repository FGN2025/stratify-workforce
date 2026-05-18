# Inbound Learning-Source Contract

This document is the integration contract for any external learning platform
that wants to write achievements, evidence approvals, or course completions
into a learner's Academy Skill Passport.

Examples of partners using this contract:
- **play.fgn.gg** — push-mode (HMAC-signed webhooks)
- **broadbandworkforce.com** — pull-mode (Academy polls; will flip to push when
  BBW ships a dispatcher)

---

## 1. Endpoint

```
POST https://<academy-host>/functions/v1/learning-source-webhook
```

For the production project the host is the standard Lovable Cloud URL.

---

## 2. Required headers

| Header                          | Value                                              |
| ------------------------------- | -------------------------------------------------- |
| `Content-Type`                  | `application/json`                                 |
| `X-Learning-Source`             | The source `slug` from `learning_sources` registry |
| `X-Learning-Source-Signature`   | `hex(hmac_sha256(secret, raw_body))`               |

Optional:

| Header           | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `X-Delivery-Id`  | Opaque idempotency key. Same id is treated as dupe. |

The HMAC secret lives only in Academy's secret store under the env var named
in `learning_sources.hmac_secret_env_name`. Partner systems sign locally with
their own copy and never transmit the secret.

---

## 3. Body envelope

```json
{
  "event_type": "achievement.earned",
  "payload": { ... },
  "timestamp": "2026-05-18T17:00:00Z",
  "delivery_id": "optional-opaque-id"
}
```

`event_type` MUST be one of:

- `achievement.earned` — a learner finished an achievement, badge, course, or quiz
- `evidence.approved` — a reviewer approved submitted evidence
- `challenge.completed` — a learner completed a challenge/quest mapped to a work order
- `enrollment.completed` — a learner finished a SCORM enrollment (treated as `achievement.earned`)

---

## 4. Canonical payload — `achievement.earned`

```json
{
  "achievement_id": "<source-unique-id>",
  "name": "OSHA-10 Construction Safety",
  "external_user_id": "<source-user-uuid>",
  "user_email": "learner@example.com",
  "earned_at": "2026-05-18T16:55:11Z",
  "xp_reward": 250,
  "skills_verified": ["osha:fall-protection", "osha:ppe"],
  "evidence_url": "https://partner.example/verify?id=...",
  "tenant": { "id": "...", "name": "..." }
}
```

Required:
- `achievement_id` — globally unique per source. Used as the credential's
  `external_reference_id` for idempotency.
- Either `external_user_id` OR `user_email` — for identity resolution.

Identity resolution order:
1. `learning_source_identity` lookup by `(source_slug, external_user_id)`
2. `auth.users` lookup by email via `get_user_id_by_email` RPC
3. Fall through to `unmapped_identity` (HTTP 202; auto-replays on signup)

---

## 5. Canonical payload — `evidence.approved`

```json
{
  "evidence_id": "<source-unique-id>",
  "external_user_id": "...",
  "user_email": "...",
  "work_order_title": "Pole Climbing Assessment",
  "skill": "fiber:pole-climb",
  "score": 92,
  "xp_reward": 100,
  "approved_at": "2026-05-18T16:55:11Z",
  "reviewer": { "id": "...", "name": "...", "email": "..." }
}
```

---

## 6. Canonical payload — `challenge.completed`

Forwarded into `sync-challenge-completion`, which handles per-challenge
work-order/lesson mapping, XP grants, and tier-gate logic. Use the same
shape Play uses (see `docs/play-to-academy-hmac-contract-ping.md`).

---

## 7. Skill-tag namespace

Each source has its own regex in `learning_sources.skill_tag_pattern`. Tags
not matching the regex are stripped from the credential and recorded in
`metadata._dropped_tags` for auditing.

Current namespaces:
- `play` — `^(fiber|osha|cdl|gaming|difficulty):[a-z0-9-]+$`
- `bbw`  — `^(fiber|osha|nicet|bicsi|cdl):[a-z0-9-]+$`

To register a new namespace, UPDATE the registry row — no code change.

---

## 8. Idempotency & replay semantics

- **Per delivery**: pass `X-Delivery-Id` (or `delivery_id` in body). Duplicates
  return HTTP 200 with `{ "duplicate": true }`.
- **Per credential**: same `achievement_id` / `evidence_id` is detected via
  the `skill_credentials` unique partial index on
  `(passport_id, external_reference_id, credential_type_key)` and returns
  `{ "duplicate": true }`.
- **Unmapped identity** (`HTTP 202`): when the learner has not yet linked
  their Academy account, the attempt is recorded but no credential is issued.
  When the user later signs up with the same email, the Play replay queue
  (also generalized to all sources in a follow-up phase) re-fires the event.

---

## 9. Strict mode flip

Sources begin in `strict_mode=false` (shadow): bad signatures are logged but
the event still processes. After a clean week:

```sql
UPDATE learning_sources SET strict_mode = true WHERE slug = '<slug>';
```

From then on, signature mismatches return `HTTP 401`.

---

## 10. Pull mode (partners with no outbound dispatcher)

If a partner cannot send webhooks, register them with `ingestion_mode='pull'`
and build a `learning-source-pull-<slug>` edge function modeled on
`learning-source-pull-bbw`. It synthesizes the same `achievement.earned`
payload and calls `handleAchievementEarned` directly — no HTTP round trip.

Once the partner ships a dispatcher:

```sql
UPDATE learning_sources SET ingestion_mode = 'push', hmac_secret_env_name = '...' WHERE slug = '<slug>';
```

Then disable the pull cron.

---

## 11. Onboarding checklist

1. Reserve a unique `slug` (lowercase, no spaces, e.g. `acme-academy`).
2. Decide `ingestion_mode` (`push` or `pull`).
3. For push: agree on an HMAC secret, add it to Academy secrets, set
   `hmac_secret_env_name` in the registry row.
4. Decide the skill-tag namespace regex.
5. Add the registry row (admin UI or SQL).
6. Map a few partner course/challenge IDs in `external_content_mappings`
   so the first events have a target work order.
7. Run in shadow mode for a week, then flip `strict_mode`.

Related docs:
- `docs/play-to-academy-hmac-contract-ping.md` — original Play contract,
  superseded for new partners by this document.
