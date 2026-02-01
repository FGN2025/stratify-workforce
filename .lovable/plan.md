

# Fix Profiles Table Security - Tenant-Scoped Visibility

## Problem Summary

The `profiles` table has a public `SELECT` policy (`USING (true)`) that allows anyone, including unauthenticated users, to query all profile data. This exposes sensitive information including:
- `tenant_id` (organizational affiliation)
- `employability_score` (performance metrics)
- `skills` (detailed competency scores)

---

## Solution Overview

Implement tenant-scoped visibility with the following access rules:

| User Type | Can View |
|-----------|----------|
| Unauthenticated | Nothing |
| Authenticated (any) | Own profile only |
| Same tenant member | Profiles in same tenant |
| Parent tenant member | Profiles in child tenants |
| Admin / Super Admin | All profiles |

---

## Database Changes

### 1. Create Helper Function for Tenant-Scoped Profile Access

Create a new SECURITY DEFINER function to check if a user can view another user's profile based on tenant membership hierarchy.

```sql
CREATE OR REPLACE FUNCTION public.can_view_profile(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Users can always see their own profile
    viewer_id = profile_id
    OR
    -- Admins can see all profiles
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = viewer_id 
      AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users in the same tenant can see each other
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.tenant_id = p2.tenant_id
      WHERE p1.id = viewer_id AND p2.id = profile_id
      AND p1.tenant_id IS NOT NULL
    )
    OR
    -- Users can see profiles in tenants they're members of (via community_memberships)
    EXISTS (
      SELECT 1 FROM community_memberships cm
      JOIN profiles p ON p.tenant_id = cm.tenant_id
      WHERE cm.user_id = viewer_id AND p.id = profile_id
    )
    OR
    -- Users in parent tenants can see profiles in child tenants
    EXISTS (
      SELECT 1 FROM community_memberships cm
      JOIN profiles p ON p.tenant_id IN (SELECT get_child_tenants(cm.tenant_id))
      WHERE cm.user_id = viewer_id AND p.id = profile_id
    )
$$;
```

### 2. Replace Public SELECT Policy

```sql
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create tenant-scoped SELECT policy
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), id));
```

---

## Why This Approach

### Using a Helper Function

1. **Avoids RLS recursion**: The `SECURITY DEFINER` function bypasses RLS when checking membership, preventing infinite loops
2. **Maintainable**: Single place to update access logic
3. **Leverages existing functions**: Uses `get_child_tenants()` already in the database
4. **Hierarchical support**: Parent tenant admins can see child tenant profiles

### Access Matrix

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Profile Visibility Matrix                     │
├─────────────────────┬───────────────────────────────────────────┤
│ Viewer              │ Can See Profiles Of                       │
├─────────────────────┼───────────────────────────────────────────┤
│ Anonymous           │ None                                      │
│ Authenticated       │ Self                                      │
│ Same tenant_id      │ All profiles with same tenant_id          │
│ Tenant member       │ Profiles in tenants they're members of    │
│ Parent tenant       │ Profiles in child tenants (hierarchy)     │
│ Admin               │ All profiles                              │
└─────────────────────┴───────────────────────────────────────────┘
```

---

## Impact on Existing Code

### Admin Panel (Admin.tsx)
- Fetches all profiles for user management
- Will continue working because admins bypass restrictions

### Leaderboard (usePoints.ts)
- Fetches profiles by user IDs for display
- Will work for profiles within the user's tenant scope
- May need adjustment if leaderboard should be cross-tenant public

### Audit Logs (useAuditLogs.ts)
- Admin-only feature, will continue working

### RoleEscalationControls.tsx
- Super admin feature, will continue working

---

## Consideration: Public Leaderboard Feature

If leaderboards need to display profiles publicly (for embeddable widgets), consider creating a limited public view:

```sql
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, username, avatar_url
FROM public.profiles;

-- Grant public SELECT on the view only
```

This keeps sensitive fields (tenant_id, scores, skills) protected while allowing basic profile info for public displays.

---

## Migration Summary

| Step | Action |
|------|--------|
| 1 | Create `can_view_profile()` helper function |
| 2 | Drop existing public SELECT policy |
| 3 | Create new tenant-scoped SELECT policy |
| 4 | (Optional) Create public view for leaderboards |

---

## Security Verification

After implementation, the following should be true:

1. Unauthenticated requests return empty results
2. Authenticated users see only their profile and profiles in their tenant/memberships
3. Admins see all profiles
4. Sensitive fields (scores, skills, tenant_id) are not accessible to unauthorized viewers

---

## Files Changed

| File | Change |
|------|--------|
| (Migration) | SQL to create function and update RLS policies |
| (Security Finding) | Delete `profiles_table_public_exposure` finding |

No frontend code changes required - the existing queries will automatically respect the new RLS policies.

