# FGN Academy → FGN Studio — handoff (Phase 3 prep)

Recorded 2026-09-23. Read-only contract. No credential appears in this document, in chat, or in
any repository file. Phase 4 and content submissions remain blocked.

## 1. Confirmed scope

| Item | Confirmed value |
|---|---|
| Tenant | **FGN Global** `efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca` |
| Descendants | **disabled** (FGN Global has no children today; the flag stays off) |
| Access | read-only, `catalog:read` |
| Work Orders returned | all authorized maturity levels — Level 1, 2, 3, **and unclassified/legacy**, plus Academy-native |
| Promotion / exclusion for tidiness | none |

Descendant access, for the record, would add the Work Order relationship and curation rows of
every tenant beneath the chosen one (today the only real parent/child pair is Oil and Gas
Community → OK Construction). Roots are siblings; FGN Global never implies the others. It is off.

## 2. Addresses

| | |
|---|---|
| API base | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog` |
| OpenAPI (public, no credential) | `…/studio-catalog/openapi.json` |
| Capabilities probe (public) | `…/studio-catalog/capabilities` |
| Repo copies | `docs/api/studio-catalog/README.md`, `docs/openapi/studio-catalog.yaml` |
| Contract version | `2026-09-23.1` |

## 3. The four corrections — as built

**CORS / discovery exceptions.** `/capabilities` and `/openapi.json` are credential-free and
echo any origin. Every other route is `401` without a valid short-lived token, and emits a CORS
allow header only for an origin registered against the issuing app; an unregistered browser
origin is `403 forbidden_origin`. The exception is stated identically in the OpenAPI description,
the README and the `/capabilities` payload.

**Nested tenant visibility metadata is filtered.** `visibility.curatedForTenants[]` contains only
tenants inside the credential's own scope. A Studio session cannot enumerate other organizations'
curation. Maturity and visibility are separate field groups; neither is used as a proxy for the
other, and `curationSupported: true` is reported because curation genuinely exists.

**Scope-bound cursors with safe retries.** Cursors embed a scope fingerprint, a query fingerprint
and the starting `catalogVersion`. Re-sending the same cursor returns the identical page
(idempotent retry). Foreign scope → `403 cursor_scope_mismatch`; changed query/limit → `400
cursor_query_mismatch`; malformed → `400 cursor_invalid`; catalog moved mid-walk → `409
catalog_changed` (the walk is incomplete, never silently stitched).

**Authenticated proxy token delivery.** The durable operator key is refused on every catalog route
(`401` with an explicit hint) and `POST /studio-token` refuses any request that carries an
`Origin` header, so the durable key cannot reach a browser. The proxy exchanges it for a
15-minute, single-tenant, read-only bearer token. Expiry and revocation are documented in the
README; revocation is effective on the next request.

## 4. Implementation and deployment status

| Component | Status |
|---|---|
| Edge function `studio-catalog` + `_shared/studio-auth.ts` | **deployed and live** |
| DB: `studio_tokens`, `studio_rate_limit`, `catalog_versions`, `record_version` columns, bump triggers | **applied** |
| `authorized_apps`: `can_read_catalog`, `catalog_tenant_id`, `catalog_include_descendants` | **applied** |
| `studio_vocabulary()` and `studio_rate_limit_hit()` (service-role only, revoked from clients) | **applied** |
| OpenAPI served from the function | **live** |
| Studio credential | **not issued yet** — issued out-of-band once you confirm the proxy is ready |
| Admin UI for the catalog-read scope / token revoke list | **not built** (administration is done server-side today) |

## 5. Test results — all against the deployed endpoint

Everything below was executed by HTTP against the live URL above. **No mocks, no stubs, no
in-process harness.** Tenant isolation was tested with a temporary second app scoped to Oil and
Gas Community, deleted after the run; all test tokens are revoked.

| # | Check | Result |
|---|---|---|
| 1 | `/capabilities` with no credential | 200, `authenticated:false`, no tenant |
| 2 | `/openapi.json` with no credential | 200, all 8 paths present |
| 3 | Catalog route with no token | 401 |
| 4 | Durable operator key as Bearer on a catalog route | 401 `credential_invalid` (refused by design) |
| 5 | Token mint, server-to-server | 201, TTL 900 s, tenant-bound |
| 6 | Token mint with a browser `Origin` | 403 `forbidden_origin` |
| 7 | Revoked token | 401 `credential_revoked` |
| 8 | Expired token | 401 `credential_expired` |
| 9 | App's catalog-read scope withdrawn, token still unexpired | 403 `scope_denied` |
| 10 | Unregistered origin on a catalog route | 403 `forbidden_origin` |
| 11 | Discovery route from an arbitrary origin | 200 with echoed allow-origin |
| 12 | Missing `X-Studio-Contract` | 400 `contract_version_mismatch` |
| 13 | Tenant isolation — tenant-B token vs tenant-A records | 0 overlap (B: 1 record; A: 48) |
| 14 | Descendants flag on tenant B | scope expanded to exactly `[Oil and Gas, OK Construction]`, nothing else |
| 15 | Skills pagination page 1 → page 2 | 200, no repeated cursor |
| 16 | Same cursor replayed | identical page (safe retry) |
| 17 | Cursor replayed with a different credential | 403 `cursor_scope_mismatch` |
| 18 | Malformed cursor | 400 `cursor_invalid` |
| 19 | Skill edited mid-walk | 409 `catalog_changed` (1 → 2) |
| 20 | Work Order edited mid-walk | 409 `catalog_changed` (1 → 2) |
| 21 | `recordVersion` after an edit | bumped 1 → 2 on the edited record |
| 22 | Unfiltered `/work-orders` | 200 — 48 of 57 Work Orders in FGN Global scope: 44 unclassified, 4 level_3, 43 Academy-native |
| 23 | Multiple interpretations preserved | activity `086eefb4-…` returns both trenching Work Orders |
| 24 | `/work-order-relationships` alias | 200, identical shape |
| 25 | `/vocabulary` | 200, `partial:false`, `unsupported:[]`, values cross-checked against the live enums and check constraints |
| 26 | `/sources` | 200 with per-source versions |
| 27 | Rate limit, 150 concurrent requests | 120 × 200 then 30 × 429 with `Retry-After: 51` |

Note on #27: the first burst attempt exposed a lost-update race in the counter (160 requests
counted as 64). Fixed with an atomic database increment, redeployed, and re-tested — the table
above records the result after the fix.

**Alias ambiguity (#—).** The ambiguity path is implemented and exercised, but no alias key in
the live catalog currently resolves to more than one canonical skill, so `ambiguousAliases[]`
is legitimately empty today. It is a true-negative, not an untested path; we did not manufacture
a duplicate alias in production data to make it non-empty.

**Planned, not yet executed:** the approved-origin CORS success path from Studio's real browser
origin (needs your origin registered), and your own Phase 3 acceptance suite end-to-end against a
live credential.

## 6. Remaining steps for Studio's live read verification

1. Tell us the operator proxy's egress arrangement and the browser origin(s) Studio will call
   from; we register them against the app.
2. We issue the durable operator key out-of-band (never in chat or a repo). It goes into the
   proxy only.
3. Proxy exchanges it at `POST /studio-token` and hands the 15-minute token to the browser
   session.
4. Run your acceptance suite: 401/200 credential behaviour, tenant isolation, complete pagination
   with interrupted-walk reporting, alias ambiguity, schema validation, vocabulary conformance,
   version/curation staleness, credential-clearing.
5. Publish the Phase 3 live-verification report. Any mismatch against this contract comes back to
   us before any write gate is discussed.

Approval stays with Academy. Studio approvals remain simulated. No write or submission path
exists in this contract.

## 7. Registered origins

| Origin | Status |
|---|---|
| `https://studio.fgn.gg` | **registered** (production browser origin, exact string, no wildcard) |
| Preview / staging origins | **unset** — none registered until you supply the exact strings |

Registration is exact-match; `http://`, a different host, a port or a trailing path will not
match. Verified live after registration: `OPTIONS /skills` with `Origin: https://studio.fgn.gg`
returns `200` with `access-control-allow-origin: https://studio.fgn.gg`; the same origin on
`GET /skills` without a token returns `401` (credential still required). The authenticated
approved-origin success path still needs a live token minted by your proxy — see §9.

**Proxy egress.** Not inferred and not recorded. The browser origin says nothing about where the
proxy calls from. We need the proxy operator to state its actual egress arrangement (source
addresses or the hosting arrangement) before the durable key is provisioned.

## 8. Durable key provisioning and server-side revocation

**Provisioning.** The durable operator key is **not issued**. It is generated and handed over
out-of-band only after the authenticated operator proxy is confirmed ready and its egress details
are supplied. It never appears in chat, in this document or in any repository file, and it goes
into the proxy only — never into a browser.

**Responsible administrator.** While the admin UI is unfinished, Academy super administrator
**Jake_Trucker** (`aa4618e1-5932-4243-b497-73467e4867de`) owns issuance and revocation, with
administrator **MJ** (`217ce9a1-898b-493f-8f9e-0112dc6da0d1`) as backup. Requests go to that
administrator directly; there is no self-service path.

**Revocation procedure (server-side, current).** Performed by the administrator above against the
Academy database. Each level takes effect on the very next request — nothing is cached.

| Goal | Action | Effect for Studio |
|---|---|---|
| Kill one live session token | set `revoked_at = now()` on that row in `studio_tokens` | `401 credential_revoked` |
| Kill every live token for the app | set `revoked_at = now()` on all its unrevoked `studio_tokens` rows | `401 credential_revoked` |
| Stop new tokens being minted | regenerate or invalidate the app's key hash on `authorized_apps` | mint returns `401`; existing tokens still run until they expire, so pair it with a token revoke |
| Withdraw catalog access, keep the app | set `can_read_catalog = false` on `authorized_apps` | `403 scope_denied`, even for unexpired tokens |
| Full shutdown | set `is_active = false` on `authorized_apps` | `401 credential_revoked` on every route |

Every token expires on its own after 15 minutes regardless, so the worst-case exposure window
without any action is 15 minutes. The admin UI (scope toggle, tenant/descendants selector, token
list with a revoke button) is still to be built; it will replace this procedure, not change its
semantics.

## 9. Coordination — approved-origin CORS test and Studio's live acceptance run

1. Proxy operator supplies egress details. *(waiting on Studio)*
2. Academy provisions the durable key out-of-band to the named administrator's counterpart on
   your side. *(blocked on step 1)*
3. Joint approved-origin CORS test: proxy mints a token, Studio's browser at
   `https://studio.fgn.gg` calls `/capabilities`, `/skills` and `/work-orders` with it. Expected:
   `200` with `access-control-allow-origin: https://studio.fgn.gg`. Any other origin must be
   refused `403 forbidden_origin` — please include one deliberate negative in the run.
4. Studio runs its Phase 3 acceptance suite against the live credential and publishes the report.
5. Mismatches come back to Academy before any write gate is discussed.

**Alias ambiguity stays recorded as a true-negative.** No alias key in the live catalog currently
resolves to more than one canonical skill, so `ambiguousAliases[]` is empty. This does **not**
demonstrate the ambiguous-match case — the branch is implemented but unproven against real data,
and it must not be counted as a passed acceptance check. Proving it needs a fixture outside
production data, which we have deliberately not created.

Phase 4 and content submissions remain blocked. Studio approvals remain simulated.
