# Studio Catalog API — read-only

Public endpoint documentation. **No credential is required to read this page or the OpenAPI document.**

| Item | Value |
|---|---|
| Application | FGN Academy — https://fgn.academy (also https://www.fgn.academy) |
| API base URL | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog` |
| OpenAPI (fetchable, no credential) | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog/openapi.json` |
| Capabilities probe (no credential) | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog/capabilities` |
| Contract version | `2026-09-23.1` (header `X-Studio-Contract`, required on all catalog routes) |
| Scope of this contract | **Read-only.** No write route, no submission route. Phase 4 blocked. |

`academy.fgn.gg` and `api.fgn.gg` are not ours and never were.

## Authentication

Two credentials, deliberately different:

1. **Durable operator key** (`X-App-Key`). Lives only in the operator-owned proxy. It is
   **never** accepted on a catalog route, and `POST /studio-token` refuses it outright when the
   request carries an `Origin` header — so it cannot be used from a browser.
2. **Short-lived Studio token** (`Authorization: Bearer …`). Minted by the proxy, 15-minute TTL
   (900 s), bound to exactly one tenant, one `descendants` flag and the scope `catalog:read`.
   Intended to live in Studio's memory-only browser session.

```
POST /studio-token            (server-to-server only, no Origin header)
X-App-Key: <durable operator key>
→ 201 { token, tokenType: "Bearer", expiresAt, expiresInSeconds: 900,
        scopes: ["catalog:read"], tenantId, includesDescendants }
```

**Expiry.** Hard 15 minutes from issue; there is no refresh. The proxy mints a new token.
**Revocation.** An Academy administrator revokes a token (or deactivates the issuing app, or
removes its catalog-read scope). Revocation takes effect on the very next request — tokens are
checked against the database each time, never cached. Revoked → `401 credential_revoked`.
Scope withdrawn on the app → `403 scope_denied` even for an unexpired token.

Tokens are stored as SHA-256 hashes; the plaintext exists only in the mint response.

## Authentication status — the one documented exception

`GET /capabilities` and `GET /openapi.json` may be called **with no credential, from any origin**.
`/capabilities` then answers `200` with `authenticated: false`, no tenant and an empty
`capabilities[]`. An *invalid* credential on `/capabilities` is still `401`.

**Every other route returns `401` when the credential is absent, invalid, expired or revoked.**

## CORS

- Discovery routes (`/capabilities`, `/openapi.json`) — `Access-Control-Allow-Origin` echoes any origin.
- All other routes — the allow header is emitted only for an origin registered against the
  issuing app (`allowed_origins`). An unregistered browser origin is refused `403 forbidden_origin`
  and receives no allow header. Server-to-server calls send no `Origin` and are unaffected.

## Contract version mismatch

Absent or unsupported `X-Studio-Contract` on a catalog route:

```
400 { "error": "contract_version_mismatch", "received": …,
      "currentContractVersion": "2026-09-23.1",
      "supportedContractVersions": ["2026-09-23.1"] }
```

## Routes

| Route | Notes |
|---|---|
| `GET /capabilities` | contract + catalog versions, auth status, tenant scope, `capabilities[]`, `unsupported[]` |
| `GET /skills?query=&cursor=&limit=` | canonical catalog, aliases with game scope, `ambiguousAliases[]` |
| `GET /work-orders?activityIds=&maturity=&cursor=&limit=` | **no filter required** |
| `GET /work-order-relationships` | alias of `/work-orders`, identical behaviour |
| `GET /vocabulary` | live-derived enumerations, `vocabularyVersion`, `partial`, `unsupported[]` |
| `GET /sources` | source registry with versions |

### Work Orders: maturity ≠ visibility

Two independent field groups on every item.

- `maturity` (`1|2|3|null`), `maturityState` (`level_1|level_2|level_3|unclassified`),
  `maturityApprovedAt`, `maturityReviewNote`. Nothing is promoted, retired or hidden to tidy the
  response — legacy Work Orders are returned as `unclassified`.
- `visibility` = `{ ownerTenantId, ownerTenantLabel, visibilityMode, isActive,
  curationSupported: true, curatedForTenants[] }`.

`curatedForTenants[]` is **filtered to the credential's own tenant scope**. A Studio session never
learns which other organizations curated a Work Order.

### Academy-native and multiple interpretations

`activityIds` is optional and never required. An unfiltered read returns everything in scope,
including Academy-native Work Orders where `activityId` is `null` and `academyNative` is `true`.
One activity may legitimately carry several Work Orders — they are distinct educational
interpretations, not duplicates, and both are returned.

### Skills

Platform-global; not tenant-filtered (stated explicitly in the `scope` block of the response).
Each alias carries `aliasKey`, `gameScope` (null = global) and `ambiguous`. Any alias key
resolving to more than one canonical skill is listed in `ambiguousAliases[]` with
`resolvable: false` — computed across the whole alias table, not just the current page.

## Versions, stale reads and concurrent pagination

Every catalog response carries `catalogVersion` and `catalogChangedAt`; each item carries
`recordVersion`; `/vocabulary` carries `vocabularyVersion`; `/sources` carries `sourceVersion`
per source. Versions are bumped by database triggers on content edits, inserts, deletions,
skill-mapping changes, maturity approvals and curation/visibility changes.

Cursors are opaque and carry the scope fingerprint, the query fingerprint and the
`catalogVersion` the walk started on.

| Situation | Response |
|---|---|
| Same cursor sent again (safe retry) | `200`, byte-identical page — idempotent |
| Catalog changed mid-walk | `409 catalog_changed` with `cursorCatalogVersion` and `currentCatalogVersion`; the walk is incomplete, restart it |
| Cursor from another credential/scope | `403 cursor_scope_mismatch` |
| Cursor from another query or page size | `400 cursor_query_mismatch` |
| Malformed cursor | `400 cursor_invalid` |

## Vocabulary freshness

`vocabularyVersion` is a content hash of the enumerations, recomputed from the live database
catalog on **every** request — there is no time-based cache and no freshness guarantee is claimed.
A check-constraint expression that cannot be parsed into a clean enumeration is **fail-closed**:
the group is omitted, named in `unsupported[]`, and the response is marked `partial: true`. No
value is ever guessed.

## Errors

`400` contract_version_mismatch, cursor_invalid, cursor_query_mismatch ·
`401` credential_absent, credential_invalid, credential_expired, credential_revoked ·
`403` scope_denied, forbidden_origin, cursor_scope_mismatch ·
`404` not_found · `405` method_not_allowed (catalog routes are read-only) ·
`409` catalog_changed · `429` rate_limited (120 requests / 60 s, `Retry-After` set).

## Approval ownership

Academy owns approval of skills and Work Orders. No Studio-side approval is authoritative, and
this contract carries no decision channel. Studio approvals remain labelled simulated.
