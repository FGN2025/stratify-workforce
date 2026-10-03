# Academy answers to Studio questions A1–A4 (2026-10-03)

Contract: `2026-09-23.1` (unchanged; all changes below are additive under the versioning rule in A1).
Base: `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog`

## A1 — Contract documentation and versioning — ANSWERED
- Machine-readable JSON Schema (2020-12) for every 200 response, no credential needed:
  `/schemas` (index + versioning policy), `/schemas/{capabilities|skills|work-orders|vocabulary|sources|vocabulary-term}.json`. The OpenAPI document links each 200 response to its schema.
- Sanitised examples: `docs/api/studio-catalog/examples/*.200.json` (captured live 2026-10-03).
- Declared types:
  - Work Order `title`: string or null. Null = untitled. Academy never activates an untitled Work Order (publication trigger); "Untitled work order" is an admin-preview label only and is never emitted.
  - `catalogVersion` / `sourceVersion`: monotonic integer per catalog, compare numerically.
  - `recordVersion`: per-row change counter, increases on any edit.
  - `skillVersion`: editorial version of a skill's meaning.
  - `vocabularyVersion`: opaque content hash, equality only.
  - Vocabulary term: `{ value: ^[a-z0-9_]+$, label: string }` — match on `value`, never `label`.
- Enumerations: closed lists carry `"x-enum-closed": true` (visibilityMode, maturityState, maturity, evidenceStatus, scopeReason, vocabulary group names). Open lists carry `false` (gameTitle, classification, curationState, values inside vocabulary groups, sourceId).
- Versioning rule: additive (new optional field, new endpoint, new value in an open list, label text) keeps the version. Breaking (remove/rename field, type or nullability change, any change to a closed list, changed meaning, optional→required) mints a new version; the old one stays in `supportedContractVersions` ≥ 90 days. Readers ignore unknown fields and flag unknown closed-list values as drift.
- Live check: all five live responses validated PASS against the published schemas (ajv, 2026-10-03).

## A2 — Curation branch — TESTED LIVE, defect found and fixed
Finding: `/work-orders` returned only records owned inside the credential's scope. A record owned elsewhere but curated in (`included === true`) was **never returned** — so the owner-or-curation rule was not fully implemented on Academy's side. Fixed: such records are now returned with `scopeReason: "curated_in"`; `included: false` or a missing row never adds a record. Owned records carry `scopeReason: "owned"`.

Live test (temporary orgs "QA Studio Owner" / "QA Studio Reader", not FGN Global, so FGN Global learners' catalog was never affected; all removed afterwards):

| Record (owned by QA Owner) | Reader curation | Reader token result |
|---|---|---|
| curated included true | included = true | returned, scopeReason curated_in |
| curated included false | included = false | not returned |
| no curation row | none | not returned |

## A3 — Visibility values — ANSWERED
- `visibilityMode: "public"` — any organization may see it, subject to that organization's own curation (an organization with no curation rows sees all public Work Orders; once it has any rows, only `included = true` ones).
- `visibilityMode: "tenant_private"` — owner organization and its child organizations only; curation is ignored.
- `visibilityMode: null` — not emitted today (column is required, default `public`). If ever seen, treat as hidden (Academy's learner rule fails closed on null).
- `curationSupported` — now derived from data: `true` when `public` (curation rows take effect), `false` when `tenant_private`. Previously hard-coded `true`.
- `isActive: false` = inactive draft, never shown to learners.
- Studio's rule (owner + strict curation, no permissions inferred from these fields) is correct and matches Academy.

## A4 — Second test scope — DESIGNATED AND TESTED
Second scopes used: QA Studio Owner and QA Studio Reader (top-level, no relation to FGN Global). Results:
- FGN Global token saw 0 QA records; QA Reader saw 0 FGN Global-owned records.
- QA Owner token saw 0 curation rows belonging to QA Reader (curation metadata stays scoped).
- FGN Global cursor replayed with QA Reader token → 403 `cursor_scope_mismatch`.
These were temporary. For Studio's own repeatable runs Academy will provision a standing second organization and operator key on request (owner: Jake_Trucker).

## Specialist-site questionnaire — Academy's side
For Merits, Sim Racing, Railway, Maritime: these are registry programs on independent sites. Academy provides the program registry feed, the canonical skill catalog (skills are platform-global; Academy skill keys are authoritative) and this read contract. Academy has no tenant mapping, content templates, assessment rules or award authority for these sites.
Ownership, tenants/accounts, the sites' own API, content/assessment fields, draft/read-back, and (Merits) alignment/awarding: **Don't know yet — site owner.**

## Deployment decisions D1–D8 — Academy's side
- D2: resolved — configurator.fgn.gg; Studio live at studio.fgn.gg.
- D5: Academy's approved browser origin remains `https://studio.fgn.gg`. Adding the configurator origin needs your approval (not added).
- D6: delivered — A1–A4 answers above, second-scope test, test records, revocation (Academy admin deactivates the app or revokes tokens; effective next request).
- D1, D3, D4, D7, D8: **need a named person from you.**
