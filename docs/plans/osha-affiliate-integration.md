# OSHA Affiliate-API Integration Plan

> **Status:** Deferred. Resume after Play integration (Phase E → live) completes.
> **Saved:** 2026-05-11

Pilot integration for OSHA-authorized training without a signed MSA. Uses an affiliate/referral model: learners click through from FGN Academy to a partner-hosted course; partner posts back completion via webhook; FGN Academy awards XP and records the external credential.

Initial provider target: **360training / OSHA.com** (lowest contract friction, public affiliate program, completion postback API). Architecture is provider-agnostic so HSI/ClickSafety affiliate programs can be added later as additional rows in the same tables.

## Scope

In:
- Re-classify the 4 placeholder OSHA work orders (Hazard ID, PPE, LOTO, Fall Protection) as `external_provider`-sourced
- New affiliate redirect Edge Function (signed deep-links)
- New affiliate webhook receiver Edge Function (HMAC-verified postbacks)
- New `external_providers` and `external_provider_completions` tables
- Work-order detail UI: "Start on Partner Site" CTA replacing the current SIM/Breakroom CTA for these 4 work orders
- Profile/credentials surface: external OSHA card displayed alongside Skill Passport entries
- Admin tab to view affiliate completions + manual-credit override

Out:
- Embedded SCORM player (requires Vector/HSI contract — separate future plan)
- Real-time progress telemetry (affiliate model is enrollment + completion only)
- Automated card mailing (handled by partner)
- Revenue reconciliation / commission ledger (Phase 2 if pilot succeeds)

## Architecture

```text
┌──────────────────────────┐
│ Work Order Detail (FGN)  │
│  "Start OSHA 10 →"       │
└──────────┬───────────────┘
           │ click
           ▼
┌──────────────────────────────────────┐
│ Edge: osha-affiliate-redirect        │
│  - validate user + work_order        │
│  - mint signed user_hash (HMAC)      │
│  - log enrollment_attempt            │
│  - 302 → partner deep-link           │
└──────────┬───────────────────────────┘
           │ 302
           ▼
┌──────────────────────────┐
│ 360training hosted course│
│ (learner completes)      │
└──────────┬───────────────┘
           │ webhook POST
           ▼
┌──────────────────────────────────────┐
│ Edge: osha-affiliate-webhook         │
│  - verify HMAC signature             │
│  - resolve user_hash → user_id       │
│  - upsert external_provider_         │
│    completions row                   │
│  - call award_work_order_completion  │
│  - dispatch credential.issued event  │
└──────────────────────────────────────┘
```

## Database changes

New tables:
- `external_providers` — provider registry (slug, name, base_url, webhook_secret_ref, affiliate_id_ref, is_active). Seed: `360training`.
- `external_provider_courses` — maps provider course SKU → FGN `work_order_id` with deep-link template + XP. Seed 4 OSHA rows.
- `external_provider_enrollments` — outbound click log (user_id, work_order_id, provider_id, user_hash, redirected_at, completed_at).
- `external_provider_completions` — inbound postback log (enrollment_id, raw_payload jsonb, status, credential_id, received_at).

Work-orders table: nullable `external_provider_course_id` FK. When set, UI renders affiliate CTA instead of SIM/Breakroom CTA.

Existing `credentials` table reused for the OSHA card; add `source: 'external_provider'` plus FK to `external_provider_completions.id`.

RLS:
- Users read their own enrollments/completions
- Admins read all
- Webhook function uses service role; HMAC + 5-min timestamp window provide auth

## Edge Functions

1. **`osha-affiliate-redirect`** (`verify_jwt = true`)
   - Input: `?work_order_id=<uuid>`
   - Validates user is authenticated and assigned to the work order
   - Mints `user_hash = HMAC(provider_secret, user_id + work_order_id + timestamp)`
   - Inserts `external_provider_enrollments` row
   - Returns 302 to provider deep-link with `aff`, `user_hash`, `return_url` params

2. **`osha-affiliate-webhook`** (`verify_jwt = false`)
   - Verifies `X-Affiliate-Signature` HMAC header
   - Rejects payloads older than 5 minutes (replay protection)
   - Resolves `user_hash` → enrollment row
   - Inserts completion, marks enrollment `completed_at`
   - Calls existing `award_work_order_completion` RPC for XP + status
   - Issues `credentials` row (`source: 'external_provider'`)
   - Dispatches `credential.issued` via existing `webhook-dispatch`

## Frontend changes

- `WorkOrderCard` / `WorkOrderDetail`: detect `external_provider_course_id`; render new `<OpenInPartnerButton>` instead of Breakroom/SIM CTA
- New `ExternalProviderCard` on `Profile` page listing OSHA cards with provider logo + "View on Partner" link
- Admin: new "External Provider Activity" tab — table of enrollments + completions with manual `Re-credit` action

## Secrets required (runtime)

- `OSHA_AFFILIATE_360TRAINING_AFFILIATE_ID`
- `OSHA_AFFILIATE_360TRAINING_WEBHOOK_SECRET`
- `OSHA_AFFILIATE_HASH_SECRET` (FGN-side HMAC for `user_hash`)

User must sign up at 360training affiliate portal and provide affiliate ID + agree on a webhook secret before E2E test. Sandbox-mode redirect/webhook can be stubbed via mock partner URL until creds arrive.

## Migration of existing test work orders

The 4 existing `Construction_Sim` OSHA work orders are demoted to `external_provider` and stripped of unused sim metadata. No deletion — preserves any test enrollments. XP values kept; `tenant_id` set to FGN Global so they appear in catalog by default.

## Phasing

| Phase | Deliverable | Est. effort |
|---|---|---|
| 1 | DB migration + seed data + admin read view | 1 day |
| 2 | Redirect Edge Function + WO detail CTA | 1 day |
| 3 | Webhook receiver + credential issuance | 1.5 days |
| 4 | Profile surface + admin re-credit action | 1 day |
| 5 | E2E test against 360training sandbox | 0.5 day |

Total: ~5 dev-days once affiliate credentials are in hand.

## Open questions before build

1. Confirm 360training is the chosen partner (vs. OSHA Education Center / OSHA.com — same pattern, different secrets)
2. Should the OSHA card display the partner brand prominently, or under FGN Academy branding with partner as a footnote?
3. Does the affiliate model need a per-tenant override (e.g., Oil & Gas tenant might have its own affiliate ID for revenue attribution)?

## Resume checklist (when Play integration is live)

- [ ] Confirm Play Phase E → live cutover is complete and stable for 7+ days
- [ ] Re-validate 4 OSHA test work orders still exist (or accept re-seed)
- [ ] Sign up for 360training affiliate program; obtain affiliate ID + webhook secret
- [ ] Re-open this plan; revise phasing with current sprint capacity
- [ ] Begin Phase 1 (DB migration)
