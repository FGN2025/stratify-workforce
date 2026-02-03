

# Plan: Add User Invitation System for Admins

## Overview

Currently, the Admin panel only allows managing roles for users who have already registered themselves. This plan adds the ability for super admins and admins to **invite new users** directly from the User Management panel, pre-assigning their role before they even create an account.

---

## How It Will Work

1. Admin clicks "Invite User" button in the User Management tab
2. Dialog opens requesting:
   - Email address (required)
   - Username (optional - user can set during signup)
   - Role to assign (admin, moderator, developer, or user)
   - Optional: Community/Tenant assignment
3. System sends an invitation email to the user
4. When user clicks the link, they complete signup and are automatically assigned the pre-configured role

---

## Architecture

```text
INVITE USER FLOW
════════════════════════════════════════════════════════════════════

  ┌─────────────────────┐
  │   Admin Panel       │
  │   "Invite User"     │
  │   Button            │
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │  InviteUserDialog   │
  │  - Email            │
  │  - Username         │
  │  - Role             │
  │  - Tenant (opt)     │
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │  admin-users        │
  │  Edge Function      │
  │  POST /invite       │
  └──────────┬──────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼───┐      ┌──────▼──────┐
│ Auth  │      │ user_       │
│ Admin │      │ invitations │
│ API   │      │ table       │
└───────┘      └─────────────┘
    │
    ▼
  Email sent to user
    │
    ▼
  User clicks link → Completes signup → Role auto-assigned
```

---

## Database Schema

### Table: user_invitations

Tracks pending invitations so roles can be auto-assigned when users complete signup.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Invited email address (unique per pending invite) |
| username | TEXT | Suggested username (optional) |
| role | app_role | Role to assign on signup |
| tenant_id | UUID | Optional community assignment |
| invited_by | UUID | Admin who sent the invite |
| status | TEXT | pending, accepted, expired, revoked |
| expires_at | TIMESTAMPTZ | Invite expiration (7 days default) |
| accepted_at | TIMESTAMPTZ | When user completed signup |
| created_at | TIMESTAMPTZ | When invite was sent |

### Trigger: Auto-assign role on signup

A database trigger will check `user_invitations` when a new user registers. If their email matches a pending invitation, the trigger will:
1. Create the `user_roles` entry with the pre-assigned role
2. Update the invitation status to "accepted"
3. Optionally set the user's tenant_id

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/admin-users/index.ts` | Edge function for user invitation |
| `src/components/admin/InviteUserDialog.tsx` | Dialog UI for inviting users |
| `src/hooks/useUserInvitations.ts` | Hook for invitation management |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/UserManagementTable.tsx` | Add "Invite User" button |
| `src/pages/Admin.tsx` | Wire up invitation callbacks |

---

## Edge Function: admin-users

Handles user invitation with proper authorization checks.

### Security

- Requires authenticated user with `admin` or `super_admin` role
- Uses Supabase Service Role Key (auto-provisioned) for auth admin operations
- Logs all invitations to audit trail

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /invite | Send invitation email |
| GET | /pending | List pending invitations |
| DELETE | /invite/:id | Revoke pending invitation |

### Implementation Approach

```typescript
// Edge function uses service role for admin operations
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Invite user with pre-assigned role
const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  data: { 
    username: suggestedUsername,
    pending_role: role,
  }
});
```

---

## UI Components

### Invite User Button

Added to the UserManagementTable header alongside the search bar:

```text
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search users...              ]        [+ Invite User]       │
├─────────────────────────────────────────────────────────────────┤
│ User          │ Role      │ Score │ Last Active │ Actions       │
```

### Invite User Dialog

```text
┌─────────────────────────────────────────┐
│  Invite New User                   [✕]  │
├─────────────────────────────────────────┤
│                                         │
│  Email Address *                        │
│  ┌─────────────────────────────────┐   │
│  │ newadmin@company.com            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Suggested Username                     │
│  ┌─────────────────────────────────┐   │
│  │ NewAdmin                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Assign Role *                          │
│  ┌─────────────────────────────────┐   │
│  │ 🛡️ Admin                     ▼  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Community (Optional)                   │
│  ┌─────────────────────────────────┐   │
│  │ None (Global)                ▼  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ⚠️ User will receive an email with    │
│  a link to complete their registration. │
│  The selected role will be assigned     │
│  automatically upon signup.             │
│                                         │
├─────────────────────────────────────────┤
│              [Cancel]  [Send Invite]    │
└─────────────────────────────────────────┘
```

---

## Role-Based Permissions

| Role | Can Invite |
|------|------------|
| super_admin | All roles including super_admin |
| admin | admin, moderator, developer, user |
| moderator | Cannot invite |
| developer | Cannot invite |
| user | Cannot invite |

---

## Pending Invitations Section

A collapsible section showing outstanding invitations with ability to revoke:

```text
┌─────────────────────────────────────────────────────────────────┐
│  ▾ Pending Invitations (3)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Email                    │ Role      │ Invited   │ Actions     │
│  newdev@company.com       │ Developer │ 2 days ago│ [Revoke]    │
│  trainer@school.edu       │ Moderator │ 5 days ago│ [Revoke]    │
│  admin2@fgn.gg            │ Admin     │ 6 days ago│ [Revoke]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

1. **Database Migration** - Create `user_invitations` table and auto-assign trigger
2. **Edge Function** - Build `admin-users` with invite/revoke endpoints
3. **InviteUserDialog** - Create the invitation form component
4. **useUserInvitations Hook** - Manage invitation state and API calls
5. **UserManagementTable Update** - Add invite button and pending section
6. **Testing** - Verify full invitation flow end-to-end

---

## Error Handling

| Scenario | User Message |
|----------|--------------|
| Email already registered | "A user with this email already exists" |
| Email already invited | "An invitation is already pending for this email" |
| Insufficient permissions | "You don't have permission to invite users with this role" |
| Rate limited | "Too many invitations. Please try again later." |
| Invalid email | "Please enter a valid email address" |

---

## Audit Logging

All invitation actions will be logged to `system_audit_logs`:

```json
{
  "action": "user_invited",
  "resource_type": "user_invitation",
  "details": {
    "invited_email": "newadmin@company.com",
    "assigned_role": "admin",
    "tenant_id": null
  }
}
```

---

## Technical Considerations

### Why Edge Function Instead of Client-Side?

1. **Service Role Key Required** - `auth.admin.inviteUserByEmail` requires the service role key which cannot be exposed to the client
2. **Security** - Role validation must happen server-side to prevent privilege escalation
3. **Audit Trail** - Centralized logging of all invitation attempts

### Alternative: Magic Link with Pre-Registration

If the Supabase invite email flow doesn't meet requirements, an alternative is:
1. Create a record in `user_invitations`
2. Send a custom email with a magic link containing a token
3. User clicks link, lands on special signup page
4. Upon signup, trigger assigns the pre-configured role

---

## Summary

This implementation provides:

1. **Admin User Creation** - Invite users directly from the panel
2. **Pre-Assigned Roles** - Role is set before user even registers
3. **Secure Backend** - Edge function with proper authorization
4. **Audit Trail** - All invitations logged
5. **Invitation Management** - View pending, revoke if needed
6. **Permission Controls** - Admins can only invite up to their own level

