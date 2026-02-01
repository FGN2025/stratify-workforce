
# Fix Admin Panel Menu Visibility Race Condition

## Problem Summary

The "Admin Dashboard" menu item is not appearing in the sidebar because of a race condition between authentication state and role fetching. The sidebar renders before the role data loads, and since `isAdmin` defaults to `false` during loading, the admin menu item gets filtered out.

---

## Root Cause Analysis

### Current Flow (Broken)

```text
1. Page loads
2. AppSidebar renders
3. useUserRole() called, starts async fetch
   - isLoading = true
   - isAdmin = false (default)
4. visibleAdminItems filters out "Admin Dashboard" (isAdmin is false)
5. Sidebar renders WITHOUT Admin Dashboard
6. Role fetch completes, isAdmin = true
7. Component should re-render, but filtering already done
```

### Evidence

| Check | Result |
|-------|--------|
| Network request to `user_roles` | Returns `{"role":"super_admin"}` |
| AdminRoute component | Correctly waits for `isLoading` to be false |
| AppSidebar component | Does NOT check `isLoading` state |
| Sidebar menu extraction | Shows "Students" and "Settings" but NOT "Admin Dashboard" |

---

## Solution

Update `AppSidebar.tsx` to check the loading state and show admin items while loading (optimistic UI). This prevents the menu from "jumping" when the role loads.

### Approach: Show Admin Items While Loading

If authentication is in progress, assume the user might be an admin and show the menu item. Once loading completes, the correct visibility will be applied.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Add `isLoading` check to prevent premature filtering |

---

## Implementation Details

### 1. Destructure isLoading from useUserRole

```typescript
// Before (line 50)
const { isAdmin } = useUserRole();

// After
const { isAdmin, isLoading: roleLoading } = useUserRole();
```

### 2. Also get auth loading state

```typescript
// Add import
import { useAuth } from '@/contexts/AuthContext';

// In component
const { isLoading: authLoading } = useAuth();
```

### 3. Update filtering logic

```typescript
// Before (lines 55-57)
const visibleAdminItems = adminNavItems.filter(
  (item) => !('adminOnly' in item && item.adminOnly) || isAdmin
);

// After - Show admin items if still loading (optimistic) or if user is admin
const isLoadingAuth = authLoading || roleLoading;
const visibleAdminItems = adminNavItems.filter(
  (item) => !('adminOnly' in item && item.adminOnly) || isLoadingAuth || isAdmin
);
```

---

## Why This Works

| State | isLoadingAuth | isAdmin | Admin Item Visible? |
|-------|---------------|---------|---------------------|
| Initial render | true | false | Yes (optimistic) |
| After role loads (admin) | false | true | Yes |
| After role loads (not admin) | false | false | No |
| Not authenticated | false | false | No |

This approach:
1. Shows admin items during loading to prevent UI jumps
2. Correctly hides items once loading completes if user is not an admin
3. The admin route protection still prevents unauthorized access even if the menu item is visible

---

## Alternative Approach (Not Recommended)

Show a skeleton loader for admin items while loading. This is more complex and creates visual noise for most users who aren't admins.

---

## Code Changes Summary

```typescript
// src/components/layout/AppSidebar.tsx

import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  // ... existing code ...
  
  const { isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  // Show admin items while loading to prevent race condition
  const isLoadingAuth = authLoading || roleLoading;
  const visibleAdminItems = adminNavItems.filter(
    (item) => !('adminOnly' in item && item.adminOnly) || isLoadingAuth || isAdmin
  );
  
  // ... rest of component ...
}
```

---

## Testing Plan

1. Log out and log back in as admin user (darcy@fgn.gg)
2. Verify "Admin Dashboard" appears in the sidebar immediately
3. Log in as a non-admin user
4. Verify "Admin Dashboard" disappears after loading completes
5. Verify clicking "Admin Dashboard" as non-admin redirects to home with toast message

---

## Summary

This is a one-file fix that adds proper loading state handling to the sidebar menu. The admin menu item will now appear correctly by showing it optimistically during loading and then correctly filtering based on the user's actual role once the data loads.
