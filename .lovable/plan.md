
# Fix: Super Admin Access Denied Error

## Problem

After adding the `super_admin` role to the system, **darcy@fgn.gg** is being denied access to the Admin Dashboard. The error message shown is:

> "Access Denied - You don't have permission to access the admin dashboard."

## Root Cause

The `useUserRole` hook only checks for exact role matches:

```typescript
isAdmin: role === 'admin',      // Returns FALSE for super_admin
isModerator: role === 'moderator', // Returns FALSE for super_admin
```

Since darcy@fgn.gg now has the `super_admin` role (not `admin`), the frontend denies access even though the database function `has_role()` was correctly updated to handle inheritance.

---

## Solution

Update the `useUserRole` hook to recognize that `super_admin` has all the privileges of `admin` and `moderator`.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useUserRole.ts` | Update role checks to include `super_admin` |

---

## Implementation Details

### Update useUserRole.ts

Add `isSuperAdmin` to the return interface and update the boolean checks:

```typescript
interface UseUserRoleReturn {
  role: AppRole | null;
  isSuperAdmin: boolean;  // NEW
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
}
```

Update the return statement to handle role inheritance:

```typescript
return {
  role,
  isSuperAdmin: role === 'super_admin',
  isAdmin: role === 'admin' || role === 'super_admin',
  isModerator: role === 'moderator' || role === 'super_admin',
  isLoading,
};
```

---

## How This Fixes the Issue

| Check | Before | After |
|-------|--------|-------|
| `isSuperAdmin` | N/A | `true` for super_admin |
| `isAdmin` | `false` for super_admin | `true` for super_admin |
| `isModerator` | `false` for super_admin | `true` for super_admin |

---

## Impact Analysis

The following components use `isAdmin` from `useUserRole`:

1. **`AdminRoute.tsx`** - Guards admin dashboard access (will now work correctly)
2. **`AppSidebar.tsx`** - Filters admin nav items (will now show admin links)

No database changes required since the `has_role()` function already handles inheritance correctly.

---

## Summary

This is a one-file fix that updates the frontend role checking logic to match the database function's behavior, ensuring `super_admin` users have all admin and moderator privileges throughout the application.
