# FGN Academy → FGN Studio — Phase 4 handoff: package submissions

Recorded 2026-10-10 for the Studio developer. **No credential appears in this
document, in chat, or in any repository file.** The signing/operator key is
exchanged out-of-band only (see §9).

This document covers the **write path** (Phase 4): Studio authors a SCORM
package and submits it to Academy; an Academy platform administrator reviews
it. Nothing goes live without human approval. The read path (Phase 3 catalog
API) is documented separately in `docs/api/studio-catalog/README.md` and
`docs/phase-3-studio-handoff.md`; both halves share the same token model.

Standing rule (Decision 4): submissions are **content only** — no credential,
XP or points are awarded by submission or approval.

## 1. Contract identity

| Item | Value |
|---|---|
| Submission API base | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-submit` |
| Contract version | `2026-10-10.1` (header `X-Studio-Contract`, required on every submission route; `2026-09-23.1` still accepted) |
| Browser origin | `https://studio.fgn.gg` — registered, exact string, no wildcard |
| Approval | Human, always — an Academy platform admin approves / rejects / requests revision |
| Status model | Pull. Studio polls; Academy never pushes status outbound |

## 2. Authentication — the same two credentials

1. **Durable operator key** (`X-App-Key`). Proxy-only. It is **never accepted
   on a submission route** — a durable key sent as a Bearer token is refused
   `401 credential_invalid`.
2. **Short-lived Studio token** (`Authorization: Bearer fgnstudio_…`).
   Minted by the proxy at `POST /studio-catalog/studio-token`, server-to-server
   only (no `Origin` header), 2-hour TTL (7200 s), no refresh, revocation takes
   effect on the very next request.

Because the Studio app is provisioned with `can_submit_packages`, newly minted
tokens now carry both scopes:

```
POST /studio-catalog/studio-token
X-App-Key: <durable operator key>
→ 201 { token, tokenType: "Bearer", expiresAt, expiresInSeconds: 7200,
        scopes: ["catalog:read", "submissions:create"], tenantId,
        includesDescendants }
```

A token without `submissions:create` gets `403 scope_denied` on submission
routes. Expiry, revocation and the withdrawal of the `can_submit_packages`
flag behave exactly as documented for the catalog (README §Authentication).

## 3. Submit a package

```
POST /studio-submit/submissions
Authorization: Bearer <studio token with submissions:create>
X-Studio-Contract: 2026-10-10.1
{
  "idempotencyKey": "<your unique key, max 200 chars>",
  "title": "Package title (required, max 200 chars)",
  "description": "Optional description",
  "scormVersion": "1.2",                       // "1.2" | "2004"
  "packageBase64": "<the SCORM ZIP, base64-encoded>",
  "sourceWorkOrderIds": ["<uuid>", ...],       // optional
  "requestWorkOrderCreation": false,           // optional; requires gameTitle
  "gameTitle": "Construction_Sim"              // from the Studio vocabulary
}
```

Responses:

| Status | Body | Meaning |
|---|---|---|
| `201` | `{ contractVersion, submissionId, duplicate: false, validationStatus, validationErrors, reviewStatus: "pending", statusUrl }` | Accepted for review |
| `200` | `{ submissionId, duplicate: true, validationStatus, reviewStatus }` | Same `idempotencyKey` re-submitted — the existing record is returned, no second package is stored. Safe to retry. |
| `400` | `invalid_request` | Missing/oversized fields, bad `scormVersion`, `requestWorkOrderCreation` without a valid `gameTitle` |
| `400` | `contract_version_mismatch` | Absent/unsupported `X-Studio-Contract` |
| `401` | `credential_absent` / `credential_invalid` / `credential_expired` / `credential_revoked` | Token problems |
| `403` | `scope_denied` / `forbidden_origin` | Missing scope, or a browser origin not registered against the app |
| `413` | `package_too_large` | Package exceeds 25 MB decoded |

## 4. Package rules

- ZIP archive with `imsmanifest.xml` at the root; max 25 MB decoded.
- Packages are stored in a **private** storage bucket — never public.
- Validation happens on receipt and is **fail-closed**: an unreadable ZIP, a
  missing root manifest, or a manifest with no organizations/items marks the
  submission `validation_failed` with readable reasons
  (`validationErrors[]`). Invalid packages **never reach reviewers**.
- Manifest title, organization count, item count and detected schema version
  are recorded for the reviewer.

## 5. Work Order creation option

`requestWorkOrderCreation: true` requires a `gameTitle` from the Studio
vocabulary:

`ATS`, `Farming_Sim`, `Construction_Sim`, `Mechanic_Sim`, `Fiber_Tech`,
`Roadcraft`, `MSFS_2024`, `House_Flipper`, `House_Flipper_2`,
`Electrician_Sim`.

On approval, a draft Work Order is created from the submission metadata and
stays **inactive** until an Academy admin completes the publication-readiness
checks — the same rule as every other publishing path. Approval without this
flag links the submission to `sourceWorkOrderIds` Work Orders instead (if
given).

## 6. Poll status

```
GET /studio-submit/status/<submissionId>
Authorization: Bearer <studio token>
X-Studio-Contract: 2026-10-10.1
→ 200 { contractVersion, submission: {
         id, title, validation_status, validation_errors, review_status,
         review_note, reviewed_at, scorm_course_id,
         generated_work_order_id, created_at } }
→ 404 not_found   // wrong id, or a submission belonging to another app
```

An app only ever sees its own submissions. Poll at a modest interval (e.g.
every 30–60 s); review is human-paced. Because tokens expire after 2 hours, a
long-running poll should be prepared to have the proxy re-mint a token.

## 7. Review lifecycle (Academy side)

`pending` → `approved` | `rejected` | `needs_revision`, with an optional
reviewer note returned in the status payload.

- **Approval creates inactive content only.** The submission becomes an
  **unpublished** SCORM course (and, when requested, an inactive draft Work
  Order). Publication is a separate human step in Academy; learners cannot
  see approved content until it is published through the existing publish
  flow.
- A second review decision on an already-reviewed submission is refused
  (`409 already_reviewed`). Only packages that passed validation can be
  approved (`409 validation_incomplete`).
- Approval that requested Work Order creation but lacks a valid `gameTitle`
  is refused `409 game_title_required`.

## 8. Origin rules

Browser calls are only accepted from origins registered against the issuing
app — today exactly `https://studio.fgn.gg` (exact string; `http://`, another
host, a port or a trailing path will not match). An unregistered browser
origin receives `403 forbidden_origin` and no CORS allow header.
Server-to-server calls send no `Origin` header and are unaffected.

## 9. Operator key provisioning and revocation

The durable operator key is issued **out-of-band through the secure secret
form — never in chat, email, or any document**. It goes into the operator
proxy only, never into a browser.

Issuance and revocation are owned by Academy super administrator
**Jake_Trucker**, with administrator **MJ** as backup. Every revocation level
(specific token, all app tokens, key invalidation, scope withdrawal, full app
deactivation) takes effect on the very next request — nothing is cached. Even
with no action, every token self-expires after 2 hours, bounding the worst-case
exposure window.

## 10. What Studio builds

1. Operator proxy mints short-lived tokens at `POST /studio-catalog/studio-token`.
2. Studio packages the SCORM ZIP, base64-encodes it, and submits it with a
   unique `idempotencyKey`.
3. Studio polls `GET /studio-submit/status/:id` until review completes.
4. Duplicates are handled idempotently (same key → `200 duplicate: true`).
5. Rejected / needs-revision outcomes are surfaced to the author with the
   reviewer note.

## 11. Joint acceptance checklist

Run with a real Studio package against the live endpoint:

| # | Check | Expected |
|---|---|---|
| 1 | Valid package with a Studio token | `201`, appears as `pending` in the Academy admin inbox |
| 2 | Submission without a token | `401` |
| 3 | Submission from an unapproved origin | `403 forbidden_origin` |
| 4 | Token without `submissions:create` | `403 scope_denied` |
| 5 | Invalid manifest (no root `imsmanifest.xml`) | `validation_failed` with reason; not visible to reviewers |
| 6 | Package over 25 MB | `413 package_too_large` |
| 7 | Duplicate submission (same idempotency key) | `200 duplicate: true`, no second record |
| 8 | Approval | Inactive `scorm_courses` row exists; learner cannot see it until published |
| 9 | Rejection with note | Status route reflects it with the note |
| 10 | Revoked token mid-session | `401 credential_revoked` on the next request |

## 12. Reference documents

- Catalog + submission contract: `docs/api/studio-catalog/README.md`
- Phase 3 handoff (read path, revocation, origins): `docs/phase-3-studio-handoff.md`
- OpenAPI: `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog/openapi.json`
- Contract inventory: `docs/api/contract-inventory.md`

`academy.fgn.gg` and `api.fgn.gg` are not ours and never were.
