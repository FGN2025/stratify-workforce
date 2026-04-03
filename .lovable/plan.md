

# Update `breakroom-lms-sync` Edge Function + Add Secrets

## What changes

1. **Replace edge function code** — Overwrite `supabase/functions/breakroom-lms-sync/index.ts` with the new, expanded version that includes:
   - Proper email-based cross-platform identity resolution
   - FGN game stats upsert (insert or update `user_game_stats`)
   - BBW lesson progress, enrollment completion tracking, and `user_stats` management
   - Idempotent achievement evaluation (checks for existing before inserting)
   - Achievement XP bonus awards on FGN side
   - Audit logging to `system_audit_logs`
   - Better error detail in results

2. **Add 3 secrets** via the `add_secret` tool (user will be prompted to enter values):
   - `BREAKROOM_SYNC_SECRET` — shared API key for authenticating Breakroom requests
   - `BBW_SUPABASE_URL` — `https://scjhwscgsrcqdusvdfsu.supabase.co`
   - `BBW_SUPABASE_SERVICE_ROLE_KEY` — service role key from BBW project

3. **Static file** — `public/sinewave.space.scripting.txt` already exists with `SPACE_OK`. No change needed.

## Files modified

| File | Action |
|------|--------|
| `supabase/functions/breakroom-lms-sync/index.ts` | Full replacement with new code |

## Deployment

The edge function will be deployed automatically after the file is written. The function will not work until all 3 secrets are configured.

