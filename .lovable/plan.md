# Reply to FGN Studio — Studio Catalog Read API (Phase 3 prep, rev 2)

Read-only. No write path, no submission path. Studio approvals stay simulated; Phase 4 remains blocked.

## Answers to the brief

**Address.** The Academy application is live at `https://fgn.academy` (and `www.fgn.academy`). `academy.fgn.gg` / `api.fgn.gg` were never ours. The API runs on the Academy backend functions host at `/functions/v1/<api-name>`; the exact absolute URL, the fetchable OpenAPI document and the CORS rules go in `docs/api/studio-catalog/README.md` and are shareable without any credential.

**Assumptions, corrected.**
- Canonical skills: 35, server-issued UUID plus stable `skill_key`, game-independent, with domain, classification and status. Aliases live in a separate table and may be global or game-scoped; the same alias key can legitimately point at different skills across games, so the ambiguity rule is necessary.
- Work Order ↔ activity: readable. One activity may legitimately carry several Work Orders — two valid interpretations of Excavation and Trenching already exist, and both must survive your de-duplication logic.
- Vocabulary: enumerated server-side (artifact kinds, accepted evidence types, evidence bases, assessment outcomes, signal strengths), not free text.
- Tenancy: real — parent/child hierarchy, plus per-tenant curation of Work Orders.
- Maturity and visibility are **different things** and are reported separately (see below).

**Approval ownership.** Academy owns approval. Nothing Studio approves is authoritative.

## Tenants — your confirmation needed before any credential

| Tenant | Level | ID |
|---|---|---|
| FGN Global | root | `efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca` |
| Acme Broadband | root | `6c53d350-fd36-4f86-915d-fdce66606414` |
| Oil and Gas Community | root | `6005ec7f-44d1-4be2-8f13-5b2029a9eb41` |
| └ OK Construction | child of Oil and Gas | `83933ba4-41e2-4eef-8d09-efaea38b90ff` |
| Scouting America | root | `4debf215-01e7-470c-bff4-e4cbe9ee43c4` |
| Updated Test Community | root | `d8ea0fe9-6aa0-4803-ad0f-6956daf01c14` |

My recommendation is **FGN Global, without descendants** for the Studio authoring credential. Descendant access, if you grant it, means the credential additionally reads Work Order relationships and curation rows owned by every tenant beneath the chosen one (today only Oil and Gas → OK Construction is a real parent/child pair) — it is not platform-wide, and roots are siblings, so FGN Global does not imply the others. No credential is issued until you name the tenant and say descendants yes/no.

## Endpoints

Base `…/functions/v1/studio-catalog`. All GET, JSON, `X-Studio-Contract: 2026-09-23.1`.

- `/capabilities` — `{ contractVersion, supportedContractVersions[], authenticated, tenantId, tenantLabel, includesDescendants, capabilities[], unsupported[] }`. Unauthenticated probe is allowed here and returns `authenticated:false` with no tenant; **every other route returns 401 without a valid token**. This single documented exception is stated on the route itself and in the README.
- `/skills?query=&cursor=&limit=` — `{ catalogVersion, items:[{ skillId, skillKey, label, description, domain, classification, curationState, aliases:[{ aliasKey, gameScope, ambiguous }] }], ambiguousAliases[], nextCursor }`.
- `/work-orders?maturity=&activityIds=&tenantId=&cursor=&limit=` — the relationship read, reachable **without** any filter. Returns every Work Order the credential is authorized to see, including Academy-native ones with `activityId: null` and legacy ones with `maturity: null` (`maturityState: "unclassified"`). Filters narrow; they are never required. `/work-order-relationships` is kept as an alias of the same route for your existing client. Each item: `{ workOrderId, title, activityId, academyNative, maturity, maturityState, maturityApprovedAt, interpretationNote, visibility:{ ownerTenantId, ownerTenantLabel, visibilityMode, curatedForTenants[], curationSupported:true }, catalogVersion, recordVersion }`. Nothing is promoted, retired or hidden to tidy the response.
- `/vocabulary` — `{ vocabularyVersion, artifactKinds[], acceptedEvidenceTypes[], evidenceBases[], assessmentOutcomes[], signalStrengths[], maturityStates[], visibilityModes[], curationStates[] }`.
- `/sources` — `{ items:[{ sourceId, label, sourceVersion, lastChangedAt, lastSyncedAt }], nextCursor }` for skills, vocabulary, the GG activity cache and the Work Order catalog.

## The contract corrections, point by point

**Credential.** No durable app key is handed to a browser. Academy mints **short-lived, tenant-scoped Studio tokens**: an operator-owned durable key stays server-side in your proxy and exchanges (`POST /studio-token`, the one non-GET route, operator-to-operator) for a bearer token with a 15-minute TTL, a single tenant, a `descendants` flag and a read-only scope. Tokens are opaque, hashed at rest, and revocable individually or by key — revocation takes effect on the next request. Expiry, rotation and revocation are documented; an expired or revoked token is 401, a token without catalog read scope is 403.

**Maturity vs visibility.** Separate fields, as above. Maturity is the migration level (1/2/3, `null` = unclassified). Visibility is owner tenant, the Work Order's visibility mode, and the curated-inclusion list from the tenant curation table. Both are supported, so neither is reported as unsupported; anything we cannot answer appears in `unsupported[]` on `/capabilities` rather than being faked.

**Versions.** `catalogVersion` on every catalog response including Work Order relationships, `recordVersion` per item, `vocabularyVersion`, `sourceVersion`. Versions are maintained by database triggers on the underlying rows, and bump on content edits, deletion/deactivation, skill-mapping changes, maturity approvals and visibility/curation changes. Cursors embed the `catalogVersion` they started on: if the catalog changes mid-walk the next page returns `409 catalog_changed` with the new version, so a concurrent edit is never silently stitched into one read. A repeated or malformed cursor is `400`.

**Vocabulary freshness.** No time-based freshness claim. Values are derived from the live enum and check-constraint catalog and cached against `vocabularyVersion`, which is recomputed from a catalog hash on every request; a changed hash invalidates immediately. A constraint expression we cannot parse into an enumeration is **fail-closed**: that vocabulary group is omitted, listed in `unsupported[]`, and the response carries `partial: true` rather than a guessed list.

**Docs and CORS.** `docs/api/studio-catalog/README.md` plus a fetchable `GET /openapi.json` (and `docs/openapi/studio-catalog.yaml`), both credential-free. CORS allows the approved origins registered against the operator key plus `null`-origin server calls; unapproved origins get no allow header. A request whose `X-Studio-Contract` is absent or unsupported returns `400 contract_version_mismatch` with `{ supportedContractVersions, currentContractVersion }`.

## Technical notes

- New function `supabase/functions/studio-catalog/index.ts` + `_shared/studio-auth.ts` (token mint, hash, TTL, revocation, tenant resolution, rate limit → 429 with `Retry-After`).
- Migration: `studio_tokens` table (hashed token, tenant, descendants flag, scopes, expires_at, revoked_at, last_used_at), `catalog_versions` table plus bump triggers on `canonical_skills`, `skill_aliases`, `work_orders`, `work_order_migration_maturity`, `tenant_work_order_curation`, `task_skill_mappings`; `can_read_catalog` scope on authorized apps. Standard GRANT + RLS; the function reads with the service role only after the token resolves.
- Tenant scope enforced in SQL on every query using the existing `get_child_tenants` helper when descendants are granted.
- Admin UI: Authorized Apps gains the catalog-read scope, tenant + descendants selector, and a token list with revoke.
- Nothing in FGN.GG, Merits, Maritime, Railroading or Sim Racing is touched; no Phase 2D state changes.

## Verification before handoff (executed, then reported as completed vs planned)

Executed here: absent/invalid/expired/revoked token → 401; valid → 200; read-scope denial → 403; tenant-A token returns zero tenant-B records, with and without the descendants flag; pagination walked to exhaustion, repeated cursor rejected, mid-walk edit → 409; alias ambiguity surfaced on a known duplicated alias; every vocabulary value cross-checked against live constraints; version bumps observed after an edit, a maturity approval and a curation change; unclassified and Academy-native Work Orders present in an unfiltered read; rate limit returns 429.

Reported as planned (needs Studio): end-to-end run of your Phase 3 acceptance suite against a real credential, and approved-origin CORS from Studio's own browser origin.

## Still needed from you

The authoring tenant, and descendants yes/no.
