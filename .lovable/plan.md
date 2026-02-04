

# Plan: Fix Security Issues

## Overview

This plan addresses two security warnings identified by the database linter, plus additional security improvements found during the audit.

---

## Issues to Fix

### Issue 1: Permissive RLS Policy on `system_audit_logs`

**Current State**: The policy "System can insert audit logs" uses `WITH CHECK (true)`, allowing anyone (even unauthenticated users) to insert records into the audit log.

**Risk**: Attackers could flood the audit logs with fake entries, making it harder to detect real security incidents.

**Fix**: Update the policy to require authentication. Since audit logs are written from edge functions using the service role, we'll keep the permissive insert but require the user to be authenticated OR allow service role inserts.

```sql
DROP POLICY IF EXISTS "System can insert audit logs" ON public.system_audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.system_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
```

This ensures only authenticated users (or service role) can insert audit logs.

---

### Issue 2: Enable Leaked Password Protection

**Current State**: Leaked password protection is disabled.

**Risk**: Users could register with passwords that have been exposed in data breaches, making their accounts vulnerable.

**Fix**: Enable leaked password protection using the configure-auth tool. This will check passwords against known breach databases during signup and password changes.

---

### Issue 3: Public Exposure of `user_game_stats` (Bonus Fix)

**Current State**: The "Users can view all game stats" policy uses `USING (true)`, exposing all player performance data publicly.

**Risk**: Competitors could harvest gameplay statistics for competitive intelligence.

**Fix**: Update the SELECT policy to allow users to view:
- Their own stats
- Stats of users in the same community/tenant
- All stats if they're an admin

```sql
DROP POLICY IF EXISTS "Users can view all game stats" ON public.user_game_stats;

CREATE POLICY "Users can view their own game stats"
ON public.user_game_stats
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);
```

---

### Issue 4: Add INSERT Policy for `user_discord_connections` (Bonus Fix)

**Current State**: No INSERT policy exists, relying on service role for all inserts.

**Risk**: If there's a misconfiguration, unauthorized inserts could occur.

**Fix**: Add an explicit INSERT policy that only allows users to create their own connections:

```sql
CREATE POLICY "Users can create own discord connection"
ON public.user_discord_connections
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

---

## Implementation Order

| Step | Action | Type |
|------|--------|------|
| 1 | Update `system_audit_logs` INSERT policy | Database Migration |
| 2 | Enable leaked password protection | Auth Configuration |
| 3 | Update `user_game_stats` SELECT policy | Database Migration |
| 4 | Add `user_discord_connections` INSERT policy | Database Migration |

---

## Database Migration SQL

```sql
-- Fix 1: Restrict audit log inserts to authenticated users
DROP POLICY IF EXISTS "System can insert audit logs" ON public.system_audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.system_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix 3: Restrict game stats visibility
DROP POLICY IF EXISTS "Users can view all game stats" ON public.user_game_stats;

CREATE POLICY "Users can view their own game stats"
ON public.user_game_stats
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 4: Add explicit INSERT policy for discord connections
CREATE POLICY "Users can create own discord connection"
ON public.user_discord_connections
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

---

## Auth Configuration Change

Enable leaked password protection to check passwords against known breach databases:
- **Setting**: `password_leak_protection` → `enabled`

---

## Summary

| Issue | Severity | Resolution |
|-------|----------|------------|
| Permissive INSERT on `system_audit_logs` | WARN | Restrict to authenticated users |
| Leaked password protection disabled | WARN | Enable via auth config |
| Public `user_game_stats` exposure | ERROR | Restrict to own stats + admins |
| Missing `user_discord_connections` INSERT policy | WARN | Add explicit user policy |

After these changes:
- Audit logs can only be written by authenticated sessions
- User passwords will be checked against breach databases
- Game stats are no longer publicly exposed
- Discord connections have complete RLS coverage

