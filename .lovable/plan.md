# Apply FGN SCORM Toolkit Bootstrap Migration

## What this does

Creates the database scaffolding for the FGN SCORM Toolkit's launch-token bridge between fgn.academy and play.fgn.gg, and registers the toolkit as an authorized API consumer.

## Steps

1. **Run the migration** containing the full SQL you provided:
   - Enable `pgcrypto` extension (for `gen_random_bytes` / `digest`)
   - Create helper trigger function `public.set_scorm_updated_at()`
   - Create table `public.scorm_launch_tokens` with columns: token, challenge_id, scorm_student_id, scorm_student_name, scorm_session_id, status (pending/launched/completed/failed/expired), preliminary_score, expires_at (default now + 7 days)
   - Add 4 indexes (token, status, correlation, expires_at) and updated_at trigger
   - Enable RLS with deny-all policies for authenticated users (service-role only access)
   - Create cleanup function `public.purge_expired_scorm_launch_tokens()`
   - Create one-shot provisioner `public.provision_fgn_scorm_toolkit_app()`

2. **Invoke the provisioner** via `SELECT public.provision_fgn_scorm_toolkit_app();` to mint the plaintext API key. The function inserts a row into `authorized_apps` with `app_slug = 'fgn-scorm-toolkit'`, stores only the sha256 hash, and returns the plaintext **once**.

3. **Surface the plaintext key** to you so you can store it as `FGN_ACADEMY_APP_KEY` in the SCORM toolkit environment. (I'll display it in chat — capture it immediately; it cannot be retrieved again.)

4. **Run the security linter** afterward to confirm no new findings on the table/policies.

## Access model

- `scorm_launch_tokens`: no client (anon/authenticated) can read or write — only Edge Functions using the service-role key. This matches the bridge-token pattern (Edge Function mints token, play.fgn.gg validates via service role).
- `authorized_apps` row identifies the toolkit; API requests authenticate via the existing `verify_app_api_key()` RPC pattern already in the project.

## Rotation

To rotate later: delete the `authorized_apps` row where `app_slug = 'fgn-scorm-toolkit'`, then re-run `provision_fgn_scorm_toolkit_app()`.

## Files

- New: `supabase/migrations/20260429120000_scorm_authoring_init.sql` (created via migration tool)
- No application code changes in this step.
