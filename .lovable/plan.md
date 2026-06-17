# Rename "Override Code" → "Invite Code" and Add Customer ID Field

## Scope
Update the onboarding dialog (the "Join FGN Academy" popup) to:
1. Re-label the existing override-code section as **Invite Code** in all user-visible copy.
2. Add a new optional **Customer ID** input on the Personal Info step. Stored now for future use; matching against the tenant directory will be wired later.

No change to the underlying `registration_codes` table or redemption logic — only labels and a new captured field.

## Changes

### Frontend — relabel
- `src/components/onboarding/OverrideCodeInput.tsx`
  - Collapsible trigger: "Have an override code?" → **"Have an invite code?"**
  - Label: "Override Code" → **"Invite Code"**
  - Helper text: "Enter a code provided by your organization to skip address verification" → **"Enter the invite code provided by your community to skip address verification."**
  - Rename component file/exports to `InviteCodeInput` (and update the single import in `AcademyOnboardingDialog.tsx`). Internal state variable `overrideCode` → `inviteCode` for clarity. The DB column `override_code_id` on `user_addresses` and the `redeemCode` hook stay as-is (internal naming) to avoid an unrelated migration.

### Frontend — new Customer ID field
- `src/components/onboarding/AcademyOnboardingDialog.tsx`
  - Add a `customerId` state value.
  - Add an optional input below Discord ID on the Personal Info step:
    - Label: "Customer ID" with "(optional)" hint and an `IdCard`/`Hash` icon.
    - Placeholder: e.g. "ACME-00123".
    - Helper text: "If your provider gave you a Customer ID, enter it here to be linked to your community automatically. (Linking coming soon.)"
  - Pass `customerId` through `handleAddressValidated` → `saveAddress` so it persists with the rest of the profile data.

### Hook + persistence
- `src/hooks/useOnboardingStatus.ts` — extend `SaveAddressInput` with optional `customerId` and write it to the new column.
- Migration: add `customer_id text` column to `public.user_addresses` (nullable, no constraint). No RLS changes needed — existing user-scoped policies cover it.

### Future hook-up (documented, not built now)
Add a short inline TODO in the dialog and hook noting that on save, an edge function will look up `customer_id` + `full_name` against a future per-tenant directory and auto-create a `community_memberships` row when matched. No backend code shipped this PR.

## Out of scope
- Tenant-side directory of customer IDs (table + admin UI) — separate PR.
- Auto-join based on Customer ID match — separate PR.
- Renaming the DB column `override_code_id`.

## Verification
1. Open the join dialog from the hero CTA.
2. Confirm the collapsible reads "Have an invite code?" and the field is labeled "Invite Code".
3. Confirm the new "Customer ID (optional)" input appears under Discord ID with helper text about future linking.
4. Complete onboarding with a Customer ID; verify the value lands in `user_addresses.customer_id` via a quick read query.

## Files touched
- `src/components/onboarding/OverrideCodeInput.tsx` → renamed to `InviteCodeInput.tsx`
- `src/components/onboarding/AcademyOnboardingDialog.tsx`
- `src/hooks/useOnboardingStatus.ts`
- New migration adding `customer_id` to `user_addresses`
