# Breakroom Integration Runbook

## Overview

The platform integrates with the Breakroom virtual world (hosted on `curator.sine.space`) to automatically sync student quiz completions into FGN Academy work orders and cross-post to broadbandworkforce.com.

## Architecture

```
┌─────────────┐   pg_cron (every 15 min)   ┌─────────────────────┐
│  PostgreSQL  │ ──────────────────────────> │ breakroom-lms-poll  │
│  (pg_net)    │                             │  (Edge Function)    │
└─────────────┘                             └────────┬────────────┘
                                                     │ For each new quiz completion
                                                     ▼
                                            ┌─────────────────────┐
                                            │ breakroom-lms-sync  │
                                            │  (Edge Function)    │
                                            └────────┬────────────┘
                                                     │
                                      ┌──────────────┼──────────────┐
                                      ▼              ▼              ▼
                                 fgn.academy    bbw.com       Audit Logs
                                 (work orders,  (quizzes,
                                  XP, stats)    enrollments)
```

### Edge Functions

| Function | Purpose |
|----------|---------|
| `breakroom-lms-poll` | Polls Breakroom API for all students and their completed quizzes. Deduplicates against existing completions, then forwards new ones to `breakroom-lms-sync`. |
| `breakroom-lms-sync` | Receives a single quiz completion event. Resolves Breakroom identity → FGN user, writes work order completion + XP + game stats to FGN, and cross-posts to broadbandworkforce.com via email-based identity matching. |

### Identity Resolution

1. **Breakroom → FGN**: The `breakroom_identity` table maps `breakroom_user_id` (integer) and `breakroom_username` (string) to FGN `user_id` (UUID).
2. **FGN → BBW**: The user's email address from `auth.users` is used to find the matching account on broadbandworkforce.com.

### Work Order Matching

Breakroom quizzes are matched to FGN work orders by:
1. `metadata->>'breakroom_course_name'` matching the quiz name or course name
2. Fuzzy title matching as a fallback

---

## Secrets Management

The Breakroom API uses session-based authentication that requires periodic manual refresh.

### Required Secrets

| Secret | Description | Refresh Frequency |
|--------|-------------|-------------------|
| `BREAKROOM_SESSION_TOKEN` | The XSRF token value, used as Bearer token | When sessions expire (~weekly) |
| `BREAKROOM_SESSION_COOKIES` | Full cookie string from an authenticated browser session | When sessions expire (~weekly) |
| `BREAKROOM_JWT` | JWT token from the Breakroom session | When sessions expire (~weekly) |
| `BREAKROOM_SYNC_SECRET` | Shared secret for poll→sync inter-function auth | Rarely (set once) |
| `BBW_SUPABASE_URL` | Broadband Workforce Supabase URL | Rarely (set once) |
| `BBW_SUPABASE_SERVICE_ROLE_KEY` | Broadband Workforce service role key | Rarely (set once) |

### How to Refresh Session Tokens

1. **Log in** to [curator.sine.space](https://curator.sine.space) with the admin account
2. **Open browser DevTools** → Console
3. **Extract the cookies**:
   ```js
   document.cookie.split(';').find(c => c.trim().startsWith('xsrf'))
   ```
4. **Extract the full cookie string**:
   ```js
   document.cookie
   ```
5. **Extract the JWT** (if present in cookies):
   ```js
   document.cookie.split(';').find(c => c.trim().startsWith('jwt'))
   ```
6. **Update secrets** in Lovable Cloud:
   - `BREAKROOM_SESSION_TOKEN` → the xsrf/xsrfid token value
   - `BREAKROOM_SESSION_COOKIES` → the full cookie string
   - `BREAKROOM_JWT` → the JWT value (without `jwt=` prefix)

### Signs of Expired Tokens

- Poll function returns `students_found: 0` with errors containing `401` or `403`
- `system_audit_logs` entries for `breakroom_lms_poll` show authentication errors
- No new quiz completions being synced despite student activity

---

## Monitoring

### Check Recent Poll Results

Query the `system_audit_logs` table:

```sql
SELECT created_at, details
FROM system_audit_logs
WHERE action = 'breakroom_lms_poll'
ORDER BY created_at DESC
LIMIT 5;
```

A healthy poll result looks like:
```json
{
  "students_found": 3,
  "quizzes_found": 0,
  "already_synced": 0,
  "synced": 0,
  "sync_errors": 0,
  "errors": []
}
```

### Manual Invocation

The poll function can be invoked manually via the Lovable Cloud edge function tools or by calling:

```
POST https://<project-ref>.supabase.co/functions/v1/breakroom-lms-poll
```

No authentication is required for manual invocation (JWT verification is disabled).

---

## Cron Schedule

The poll runs every 15 minutes via `pg_cron`:

```sql
SELECT * FROM cron.job WHERE jobname = 'breakroom-lms-poll';
```

To temporarily disable:
```sql
SELECT cron.unschedule('breakroom-lms-poll');
```

To re-enable:
```sql
SELECT cron.schedule(
  'breakroom-lms-poll',
  '*/15 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `students_found: 0`, 401 errors | Session tokens expired | Refresh all 3 session secrets |
| Students found but `quizzes_found: 0` | No completed quizzes, or `breakroom_user_id` not set in `breakroom_identity` | Verify identity mapping |
| Quizzes found but `synced: 0`, `already_synced: N` | All quizzes already processed | Expected behavior — no new completions |
| `sync_errors > 0` | `breakroom-lms-sync` failures | Check sync function logs and error messages in results |
| No audit log entries | Cron job not running or function not deployed | Check `cron.job` table and redeploy function |
