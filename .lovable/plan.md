
# Plan: Add Developer Role to Restrict /developers Portal Access

## Overview

Add a `developer` role to the `app_role` enum to restrict access to the `/developers` portal. Super admins will be able to designate users as developers, and only users with the developer role (or super_admin) will be able to access the "My Apps" credential management section. The documentation section will remain public for viewing.

## Current State Analysis

### Existing Role System
- **Enum Values**: `admin`, `moderator`, `user`, `super_admin`
- **Hook**: `useUserRole.ts` returns flags for `isSuperAdmin`, `isAdmin`, `isModerator`
- **Route Protection**: `AdminRoute.tsx` pattern for role-based route guards
- **Role Management**: `RoleEscalationControls.tsx` for super admin role assignments

### Current authorized_apps RLS Policies
| Policy | Command | Condition |
|--------|---------|-----------|
| Admins can view authorized apps | SELECT | `has_role(auth.uid(), 'admin')` |
| Super admins can manage authorized apps | ALL | `has_role(auth.uid(), 'super_admin')` |

### Issue with Current Setup
- The authorized_apps table is admin-only access
- There's no `owner_id` column on `authorized_apps` to scope apps to individual developers
- The MyAppsSection currently fetches ALL authorized apps (admin view)

---

## Implementation Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER ROLE IMPLEMENTATION                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐     │
│  │                           ROLE HIERARCHY                                │     │
│  │                                                                         │     │
│  │     super_admin  ──────►  All Permissions                              │     │
│  │          │                (can assign developer role)                   │     │
│  │          │                                                              │     │
│  │          ▼                                                              │     │
│  │       admin  ──────────►  Platform Management                          │     │
│  │          │                                                              │     │
│  │          │    ┌─────────────────────────────────┐                      │     │
│  │          │    │                                 │                      │     │
│  │          ▼    ▼                                 │                      │     │
│  │     moderator    developer ◄───── NEW ROLE     │                      │     │
│  │          │           │                          │                      │     │
│  │          │           └──► API credential        │                      │     │
│  │          │               management only        │                      │     │
│  │          ▼                                      │                      │     │
│  │        user  ─────────────────────────────────────►  Basic access      │     │
│  │                                                                         │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐     │
│  │                       /developers PAGE ACCESS                          │     │
│  │                                                                         │     │
│  │   Documentation Tab  │  Public - anyone can view                       │     │
│  │                      │                                                  │     │
│  │   My Apps Tab        │  Protected - requires developer or super_admin  │     │
│  │                      │  Shows only apps owned by current user          │     │
│  │                      │  (super_admin sees all apps)                    │     │
│  │                                                                         │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Changes

### 1.1 Add Developer to app_role Enum

Add the `developer` value to the existing `app_role` enum type.

### 1.2 Add owner_id Column to authorized_apps Table

```text
New Column: owner_id (uuid, references auth.users, nullable for legacy apps)
```

This allows developers to own their own apps, while super_admins can still see and manage all apps.

### 1.3 Update has_role() Function

Modify the `has_role()` security definer function to support the new developer role:

```text
Current: super_admin inherits admin and moderator
Updated: super_admin inherits admin, moderator, AND developer
```

### 1.4 Update RLS Policies for authorized_apps

| Policy | Command | Condition |
|--------|---------|-----------|
| Developers can view their own apps | SELECT | `owner_id = auth.uid()` |
| Developers can manage their own apps | ALL | `owner_id = auth.uid()` |
| Super admins can manage all apps | ALL | `has_role(auth.uid(), 'super_admin')` |
| Admins can view all apps | SELECT | `has_role(auth.uid(), 'admin')` |

---

## Phase 2: Frontend Changes

### 2.1 Update useUserRole Hook

Add `isDeveloper` flag to the hook return value:

```text
File: src/hooks/useUserRole.ts

Add to return object:
  isDeveloper: role === 'developer' || role === 'super_admin'
```

### 2.2 Create DeveloperRoute Component

Following the AdminRoute.tsx pattern, create a route guard for developer-only sections:

```text
File: src/components/auth/DeveloperRoute.tsx

Logic:
- If not authenticated → redirect to /auth
- If not developer/super_admin → show access denied message
- Otherwise → render children
```

### 2.3 Update Developers Page

Modify the page to conditionally render the "My Apps" tab:

```text
File: src/pages/Developers.tsx

Changes:
- Documentation tab: Always visible (public)
- My Apps tab: Only visible if user isDeveloper or isSuperAdmin
- Redirect away from apps tab if user navigates directly without permission
```

### 2.4 Update MyAppsSection Component

Modify to filter apps by ownership:

```text
File: src/components/developers/MyAppsSection.tsx

Changes:
- Regular developers: Only see apps where owner_id = current user
- Super admins: See all apps (existing behavior)
- Show "Request Developer Access" message for non-developers
```

### 2.5 Update useAuthorizedApps Hook

Add optional `ownerId` filter parameter:

```text
File: src/hooks/useAuthorizedApps.ts

Changes:
- Accept optional owner filter
- RLS will enforce access, but filter helps UX
```

### 2.6 Update useCreateAuthorizedApp Hook

Automatically set owner_id when creating apps:

```text
File: src/hooks/useAuthorizedApps.ts

Changes:
- Include owner_id: auth.uid() in insert mutation
```

---

## Phase 3: Admin UI Updates

### 3.1 Update RoleEscalationControls

Add developer role option to the role selector:

```text
File: src/components/admin/superadmin/RoleEscalationControls.tsx

Changes:
- Add developer to roleConfig with appropriate icon/color
- Add SelectItem for developer role in dropdown
- Update description text to mention developers
```

### 3.2 Update RoleAssignmentDialog

Add developer role option:

```text
File: src/components/admin/RoleAssignmentDialog.tsx

Changes:
- Add developer SelectItem with description
- Add icon for developer role (Code icon)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/DeveloperRoute.tsx` | Route guard for developer-only sections |

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `developer` to `app_role` enum, add `owner_id` column, update RLS |
| `src/hooks/useUserRole.ts` | Add `isDeveloper` flag |
| `src/hooks/useAuthorizedApps.ts` | Add owner_id to create mutation |
| `src/pages/Developers.tsx` | Conditional tab rendering based on role |
| `src/components/developers/MyAppsSection.tsx` | Filter by ownership, handle non-developer state |
| `src/components/admin/superadmin/RoleEscalationControls.tsx` | Add developer role option |
| `src/components/admin/RoleAssignmentDialog.tsx` | Add developer role option |

---

## Database Migration SQL Summary

```text
1. ALTER TYPE app_role ADD VALUE 'developer'

2. ALTER TABLE authorized_apps ADD COLUMN owner_id uuid REFERENCES auth.users(id)

3. UPDATE has_role() function to include developer in super_admin inheritance

4. DROP existing authorized_apps policies

5. CREATE new policies:
   - Developers can view own apps (SELECT where owner_id = auth.uid())
   - Developers can manage own apps (ALL where owner_id = auth.uid())
   - Admins can view all apps (SELECT with has_role admin)
   - Super admins can manage all apps (ALL with has_role super_admin)
```

---

## Access Control Summary

| User Type | View Docs | View My Apps Tab | Create Apps | Manage Own Apps | Manage All Apps |
|-----------|-----------|------------------|-------------|-----------------|-----------------|
| Anonymous | Yes | No | No | No | No |
| Authenticated User | Yes | No | No | No | No |
| Developer | Yes | Yes | Yes | Yes | No |
| Admin | Yes | Yes (view only) | No | No | No |
| Super Admin | Yes | Yes | Yes | Yes | Yes |

---

## Estimated Effort

| Phase | Time Estimate |
|-------|---------------|
| Phase 1: Database changes | 15 min |
| Phase 2: Frontend changes | 30 min |
| Phase 3: Admin UI updates | 15 min |
| **Total** | **~1 hour** |

---

## Security Considerations

1. **RLS Enforcement**: All access control enforced at database level via RLS policies
2. **Server-Side Validation**: The `has_role()` function runs as SECURITY DEFINER, preventing policy bypass
3. **Ownership Scoping**: Developers can only CRUD their own apps, preventing unauthorized access
4. **Super Admin Override**: Super admins maintain full visibility and control for platform management
5. **Audit Trail**: Role changes are logged via existing `system_audit_logs` integration

