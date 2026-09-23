# Reply to FGN Studio — Studio Catalog Read API (Phase 3 prep)

## Answers to the brief (facts, before any build)

**1. Address.** The Academy application is live at `https://fgn.academy` (also `https://www.fgn.academy`). `academy.fgn.gg` and `api.fgn.gg` were never ours — correctly discarded. The API is served from the Academy backend functions host, base path `/functions/v1/<api-name>`; the exact host string is already published in `docs/api/README.md` and will be sent to Studio with the credential. An API does exist today: a public catalog read API and a credential API.

**2. Assumptions, corrected.**
- Canonical skill catalog: exists. 35 canonical skills, server-issued UUID plus a stable `skill_key`, with a separate alias table. Skills are game-independent; a skill carries domain, classification and status.
- Aliases: exist, and an alias can be global or game-scoped. Some alias keys legitimately appear more than once across games — so the ambiguity rule in section 6 is correct and necessary.
- Work Order ↔ activity: readable. Work Orders carry the canonical `simulation_activity_id` owned by FGN.GG. One activity may legitimately have **several** Work Orders (two valid interpretations of Excavation and Trenching already exist). Studio must not treat "activity already has a Work Order" as duplicate.
- Vocabulary: constrained, not free text — evidence artifact kinds, accepted evidence types, evidence bases, assessment outcomes and signal strengths are all enumerated server-side.
- Tenancy: exists. Third-party credentials live in an authorized-apps table with a tenant column; today it is not enforced on reads because no read endpoint uses it. That enforcement is part of this build.
- Curation state: exists for skills (status) and for Work Orders as the migration maturity level (Level 1/2/3, approval-only).

**3. Approval ownership.** Academy owns approval. No Studio-side approval is authoritative; Studio approvals stay labelled simulated until a separate write gate exists. This brief is read-only and we keep it that way.

## What gets built

A new read-only API `studio-catalog`, versioned `X-Studio-Contract: 2026-09-23.1`, authenticated with an Academy-issued app key (`X-App-Key`, the existing authorized-apps mechanism, extended with a read scope for Studio and server-enforced tenant scoping). Bearer-token form accepted as an alias for the same key so Studio's client needs no change.

Routes (all GET, JSON, cursor pagination `cursor` + `limit`, max 200):

- `/capabilities` — `{ contractVersion, tenantId, tenantLabel, authenticated, capabilities[] }`. Returns 200 with `authenticated:false` and no tenant only for an absent credential probe; an invalid credential is 401.
- `/skills?query=&cursor=&limit=` — `{ items:[{ skillId, skillKey, label, description, aliases[], classification, domain, catalogVersion, curationState }], nextCursor, catalogVersion }`. Aliases include their game scope. An alias resolving to more than one skill is returned in an `ambiguousAliases[]` block rather than silently bound.
- `/work-order-relationships?activityIds=&cursor=&limit=` — `{ items:[{ activityId, workOrderId, title, maturity, interpretationNote, academyNative }], nextCursor }`. `maturity` is `level_1|level_2|level_3` from the approved migration maturity record; `academyNative:true` means no GG activity, which is valid.
- `/vocabulary` — `{ vocabularyVersion, artifactKinds[], acceptedEvidenceTypes[], evidenceBases[], assessmentOutcomes[], signalStrengths[], curationStates[], maturityLevels[] }`, each value with key + human label, derived from the live database constraints/enums so it cannot drift from what we accept.
- `/sources` — `{ items:[{ sourceId, label, sourceVersion, lastSyncedAt }], nextCursor }` covering the canonical skill catalog, the vocabulary, the GG activity cache and the Work Order catalog, so a stale read is detectable.

Conventions honoured: server-issued stable identifiers (UUIDs; we never emit `local:`, `proposal:`, `sim-`), opaque cursors that never repeat, `catalogVersion`/`sourceVersion` on every read, explicit curation state, and status codes 401 (absent/invalid/expired), 403 (out-of-scope), 429 (rate limited), 200 otherwise.

## Technical notes

- New edge function `supabase/functions/studio-catalog/index.ts`, plus `_shared/studio-auth.ts` for key hashing, tenant resolution and rate limiting. Public via `verify_jwt=false`, with in-code key validation.
- Migration: add `can_read_catalog` boolean and require `tenant_id` on authorized apps used by Studio; add an `api_key_last_used_at`, `revoked_at` and a per-key request counter table for 429. Grants + RLS per the standard pattern; the function reads with the service role only after the key resolves to an active, non-revoked app.
- Tenant scoping is applied in SQL on every query (skills are platform-global and marked as such in `/capabilities`; Work Order relationships are filtered to the app's tenant and its descendants via the existing hierarchy helper).
- Vocabulary values are read from `pg_constraint`/enum catalogs at request time and cached 5 minutes, so the endpoint cannot advertise a value the database rejects.
- OpenAPI written to `docs/openapi/studio-catalog.yaml`, with `docs/api/studio-catalog/README.md` describing auth, pagination, versions and the ambiguity rule.
- Admin UI: the Authorized Apps manager gains the catalog-read toggle and a required tenant selector for catalog-read apps.
- Nothing in FGN.GG, Merits, Maritime, Railroading or Sim Racing is touched. No write path, no submission path, no change to Phase 2D state.

## Verification before I hand over a credential

Absent/invalid/valid key checks; tenant-A key returning zero tenant-B Work Order relationships; a >1-page skill walk read to exhaustion with no repeated cursor; alias ambiguity surfaced on a known duplicated alias; every vocabulary value cross-checked against the live constraints; revoked key returns 401.

## What I still need from you

The tenant that the Studio credential should be scoped to, and whether Studio should see Level 1/2 (not yet evidence-validated) Work Orders or only Level 3.
