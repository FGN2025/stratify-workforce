
# Admin Dashboard Implementation Plan

## Overview

This plan creates a dedicated Admin Dashboard at `/admin` that provides system-wide management capabilities, distinct from the per-user Settings page. The dashboard will be protected by role-based access control, allowing only users with the `admin` role to access it.

---

## Architecture Summary

```text
+------------------+     +------------------+     +------------------+
|   Admin Route    |---->|  AdminProtected  |---->|  Admin Dashboard |
+------------------+     +------------------+     +------------------+
                                |                         |
                                v                         v
                         +-------------+          +------------------+
                         | useUserRole |          | User Management  |
                         | Hook        |          | Work Orders      |
                         +-------------+          | Analytics        |
                                                  | System Settings  |
                                                  +------------------+
```

---

## Implementation Components

### 1. Role-Checking Hook (`useUserRole`)

Create a reusable hook to fetch the current user's role from the `user_roles` table:

| Property | Type | Description |
|----------|------|-------------|
| `role` | string or null | Current user's role (admin, moderator, user) |
| `isAdmin` | boolean | Convenience check for admin access |
| `isLoading` | boolean | Loading state while fetching |

### 2. Admin Route Protection (`AdminRoute`)

A higher-order component that:
- Checks if the user is authenticated
- Verifies the user has the `admin` role
- Redirects non-admins to the homepage with an error toast
- Shows loading state while verifying permissions

### 3. Admin Dashboard Page

A marketplace-style page following the existing UX patterns with:

**Hero Section**
- Title: "Admin Dashboard"
- Subtitle: System management and user oversight
- Background: Dark industrial/control room imagery
- Stats: Total Users, Work Orders, Active Sessions

**Management Sections**

| Section | Features |
|---------|----------|
| **User Management** | View all users, assign roles, view activity |
| **Work Order Management** | Create/edit/delete work orders system-wide |
| **Community Management** | Manage tenants and their settings |
| **System Analytics** | Platform-wide metrics and activity |
| **Role Management** | Assign and revoke user roles |

---

## Database Requirements

No new tables needed. We will use existing tables:
- `profiles` - User data
- `user_roles` - Role assignments (already exists)
- `work_orders` - Training scenarios
- `tenants` - Communities
- `telemetry_sessions` - Activity data

### New RLS Policy Required

Add a policy to allow admins to view all profiles for user management:

```sql
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

---

## New Files to Create

### File Structure

```text
src/
  hooks/
    useUserRole.ts           (role-checking hook)
  components/
    auth/
      AdminRoute.tsx         (admin-only route wrapper)
    admin/
      AdminHero.tsx          (hero section component)
      UserManagementTable.tsx (users list with actions)
      RoleAssignmentDialog.tsx (role change modal)
      AdminStatsGrid.tsx     (platform metrics)
      WorkOrderManagement.tsx (CRUD for work orders)
      TenantManagement.tsx   (community settings)
  pages/
    Admin.tsx                (main admin dashboard)
```

---

## Page Layout

### Admin Dashboard (`/admin`)

**Section 1: Hero**
- Dark gradient with control room aesthetic
- Key platform stats (users, work orders, sessions)
- Quick action buttons: "Add User", "New Work Order"

**Section 2: User Management Carousel**
- Cards showing recently active users
- Quick role indicators (admin badge, moderator badge)
- Click to view full profile

**Section 3: Full User Table**
- Searchable and filterable
- Columns: User, Email, Role, Score, Last Active, Actions
- Actions: View Profile, Change Role, Suspend

**Section 4: Work Order Management**
- Grid of all work orders (not filtered by tenant)
- Create new, edit existing, toggle active status
- Filter by game type

**Section 5: Community Overview**
- Tenant cards with member counts
- Brand color and configuration preview
- Link to full tenant settings

**Section 6: System Metrics**
- Total sessions this week
- Average employability score
- Most popular game channels

---

## Navigation Updates

Update the sidebar to conditionally show the Admin link only for admin users:

```typescript
// AppSidebar.tsx
const adminNavItems = [
  { title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck },
  { title: 'Students', url: '/students', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];
```

The "Admin Dashboard" item will only render if `useUserRole().isAdmin` is true.

---

## Routing Changes

```typescript
// App.tsx
import Admin from './pages/Admin';
import { AdminRoute } from '@/components/auth/AdminRoute';

<Route path="/admin" element={
  <AdminRoute><Admin /></AdminRoute>
} />
```

---

## User Management Features

### View All Users
- Query all profiles with their roles
- Display in paginated table
- Search by username or email

### Role Assignment
- Modal dialog to change user role
- Dropdown: admin, moderator, user
- Confirmation before saving
- Uses existing `user_roles` table

### User Activity
- Show last active timestamp
- Current session status
- Employability score trend

---

## Work Order Management Features

### Admin-Level Controls
- Create work orders for any tenant or globally (tenant_id = null)
- Edit any work order regardless of ownership
- Toggle active/inactive status
- Delete work orders (with confirmation)

### Bulk Actions
- Activate/deactivate multiple work orders
- Assign to different tenants

---

## Technical Details

### useUserRole Hook

```typescript
export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role || null);
        setIsLoading(false);
      });
  }, [user]);

  return {
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isLoading,
  };
}
```

### AdminRoute Component

```typescript
export function AdminRoute({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!isAdmin) {
    toast.error("Access denied. Admin privileges required.");
    return <Navigate to="/" />;
  }

  return children;
}
```

---

## Visual Design

The Admin Dashboard will follow the existing industrial/dark theme with:

| Element | Style |
|---------|-------|
| Hero Background | Dark control room or command center imagery |
| Accent Color | Uses system primary (emerald by default) |
| Cards | Glass-card styling with subtle borders |
| Tables | Dark background with hover states |
| Admin Badges | Red/amber accent for visual distinction |

---

## Implementation Order

1. **Database**: Add RLS policy for admin profile access
2. **Hook**: Create `useUserRole` hook
3. **Route Guard**: Create `AdminRoute` component
4. **Hero Component**: Build `AdminHero` with platform stats
5. **User Table**: Create `UserManagementTable` with role actions
6. **Role Dialog**: Create `RoleAssignmentDialog` modal
7. **Admin Page**: Assemble all components into `/admin` page
8. **Navigation**: Update sidebar with conditional admin link
9. **Routing**: Add admin route to App.tsx

---

## Security Considerations

- Admin status is verified server-side via RLS policies and the `has_role` function
- Role changes are protected by RLS (only admins can insert/update `user_roles`)
- Work order mutations will need new RLS policies for admin access
- Never expose admin status check to client-side manipulation
