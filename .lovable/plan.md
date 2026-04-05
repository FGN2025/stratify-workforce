

# Scheduled Cron Job for Breakroom Polling

## Issues Found

1. **Edge function `breakroom-lms-poll` does not exist.** Only `breakroom-lms-sync` is deployed. Either the cron job should call `breakroom-lms-sync`, or a new `breakroom-lms-poll` edge function needs to be created first.

2. **`current_setting()` won't work.** Supabase does not expose `app.supabase_url` or `app.service_role_key` as Postgres settings. The cron job SQL must use hardcoded values (the project URL and anon key).

3. **Must use the data insert tool, not migrations.** Per project guidelines, cron job scheduling contains project-specific secrets and should not be stored in migration files that could be replayed on other environments.

## Proposed Approach

Once the target edge function is confirmed, I will:

1. **Enable extensions** via a migration (schema change):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

2. **Schedule the cron job** via the insert tool (data operation) with hardcoded values:
   ```sql
   SELECT cron.schedule(
     'breakroom-lms-poll',
     '*/15 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/<function-name>',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon-key>"}'::jsonb,
       body := '{}'::jsonb
     )
     $$
   );
   ```

## Decision Needed

Which edge function should the cron job call?

- **`breakroom-lms-sync`** (the existing function)
- **`breakroom-lms-poll`** (a new function that needs to be created first — please provide the code or requirements)

