

# Add Health Check Endpoint for FGN Play Integration

## Overview

Create a new edge function and admin UI component that validates both API keys are working:
1. **PLAY_FGN_ANON_KEY** — can we still read challenges from play.fgn.gg?
2. **Authorized App API Key** — is the sync-challenge-completion endpoint reachable and authenticating?

## Changes

### 1. New Edge Function: `supabase/functions/health-check-play/index.ts`

- Admin-only (verify JWT + `has_role` check)
- **Test 1**: Connect to play.fgn.gg using `PLAY_FGN_ANON_KEY`, run a lightweight query (`SELECT count(*) FROM challenges LIMIT 1`). Return pass/fail + latency.
- **Test 2**: Call `sync-challenge-completion` with a dry-run/invalid payload and confirm we get a structured error (not a 401/403 from bad API key). Accept an optional `api_key` parameter from the admin to test the authorized app key.
- Return JSON: `{ play_fgn_connection: { status, latency_ms, error? }, sync_endpoint: { status, latency_ms, error? } }`

### 2. New Admin Component: `src/components/admin/IntegrationHealthCheck.tsx`

- Card with "Check Connection Health" button
- Displays status indicators (green/red) for each check with latency
- Optional API key input field for testing the sync endpoint key
- Place it in the existing **Sync Tester** tab in the Admin panel, above the `ChallengeSyncTester`

### 3. Update Admin Page

- Import and render `IntegrationHealthCheck` inside the `sync-tester` TabsContent, before `ChallengeSyncTester`

## Technical Details

- Edge function uses `PLAY_FGN_ANON_KEY` from env (already stored as secret)
- For the sync endpoint test, the function calls itself via fetch to `SUPABASE_URL/functions/v1/sync-challenge-completion` with an intentionally invalid email, expecting a 404 "User not found" (proves auth passed)
- A 401/403 response means the API key is invalid — flagged as failure
- No database migrations needed

