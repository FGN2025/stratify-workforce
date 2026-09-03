# Passport-link email fallback (Academy side)

## Goal
`POST /passport-link` currently returns 404 `user_not_linked` whenever no `play_identity` row exists for the Play UUID — even when the same email already has an Academy account. Play now sends `user_email` in the signed payload, so Academy can fall back to email matching and permanently link the accounts.

## Current state (verified)
- `supabase/functions/credential-api/index.ts` lines 220–230: identity is resolved **only** via `play_identity.external_user_id`; no email fallback.
- `supabase/functions/play-webhook-receiver/index.ts` lines 148–187: working `resolveIdentity(externalUserId, email)` helper (play_identity hit → update `last_seen_at`; else email RPC `get_user_id_by_email` → upsert `play_identity` on `external_user_id`).
- `get_user_id_by_email(p_email)` RPC already exists (security definer).

## Changes

### 1. Extract shared helper
- New file `supabase/functions/_shared/resolve-play-identity.ts` containing `resolveIdentity(supabase, externalUserId, email)` copied from `play-webhook-receiver/index.ts` (returns `{ ok: true, userId, matchedBy: 'play_identity' | 'email' }` or `{ ok: false, reason: 'unmapped_identity' }`).
- Update `play-webhook-receiver/index.ts` to import from `_shared/` instead of its local copy — behavior unchanged.

### 2. Email fallback in `/passport-link` (`credential-api/index.ts`)
After the existing `play_identity` lookup returns null:
1. Read optional `parsed?.user_email`; if a string, normalize (trim, lowercase).
2. If present, call `resolveIdentity(supabase, externalUserId, email)` (which runs the email RPC and, on a hit, upserts `play_identity` keyed on the Play UUID — permanently linking the accounts).
3. On a hit, continue to token creation with that `user_id` and include `matched_by: 'play_identity' | 'email'` in the JSON response and the `play_sync_attempts` mirror snapshot.
4. If `user_email` is absent or no Academy account matches, return the existing 404 `user_not_linked` unchanged. Never auto-create an Academy account.

Unchanged: HMAC/ecosystem-key verification (Play signs the raw body including `user_email`, so no signature changes), TTL logic, token issuance, and behavior for callers that don't send `user_email`.

### 3. Deploy & verify
- Deploy `credential-api` and `play-webhook-receiver` edge functions.
- Smoke test via curl with a signed body:
  1. Play UUID whose email has an Academy account but no `play_identity` row → expect 200 `{ url, expires_at, user_resolved: true, matched_by: 'email' }`, plus a new `passport_link_tokens` row and a new `play_identity` row keyed on the Play UUID.
  2. Repeat the same call → fast path, `matched_by: 'play_identity'`.
  3. Play UUID with no matching email → still 404 `user_not_linked`.

## Technical details
- Email is treated as an identity hint only after HMAC signature verification, so an unsigned caller cannot probe which emails have accounts beyond the existing 404 behavior.
- The `play_identity` upsert uses `onConflict: 'external_user_id'`, identical to the webhook receiver, so the two paths cannot drift.
