

# Admin User Guide - FGN Academy Platform

## Overview

This guide provides comprehensive documentation for administrators managing the FGN Academy platform. The Admin Dashboard is accessible at `/admin` and requires either the `admin` or `super_admin` role.

---

## Accessing the Admin Dashboard

Navigate to `/admin` after logging in. The system will verify your permissions before granting access. If you don't have the required role, you'll be redirected to the home page with an "Access Denied" notification.

### Role Hierarchy

| Role | Access Level |
|------|--------------|
| **Super Admin** | Full platform access including tenant management, community review, Discord connections, and dangerous operations |
| **Admin** | Standard admin access to user management, work orders, events, media, and evidence review |
| **Moderator** | Content moderation capabilities (not admin panel access) |
| **Developer** | API credential management access |
| **User** | Standard user access only |

---

## Dashboard Overview

Upon entering, you'll see:

- **Hero Section**: Displays key platform metrics (Total Users, Work Orders, Active Sessions)
- **Stats Grid**: Additional metrics including Average Score, Sessions This Week, Top Game, and New Users This Week
- **Tabbed Navigation**: Access to all admin modules

### Admin Tabs (All Admins)

1. User Management
2. Events
3. Work Orders
4. Evidence Review
5. SIM Games
6. SIM Resources
7. Media Library
8. Registration Codes

### Super Admin-Only Tabs

9. Community Review (highlighted in primary color)
10. Authorized Apps (highlighted in primary color)
11. Credential Types (highlighted in primary color)
12. Discord (highlighted in Discord purple #5865F2)
13. Super Admin (highlighted in amber/gold)

---

## User Management Tab

### Viewing Users

The User Management table displays all registered users with:
- Avatar and username
- Current role (with visual badge)
- Employability Score
- Last active date
- Actions column

### Changing User Roles

1. Click "Manage Role" on any user row
2. In the dialog, select the new role from the dropdown:
   - **User**: Standard access
   - **Moderator**: Content moderation
   - **Developer**: API credential management
   - **Admin**: Full system access
3. Click "Save Changes"

### Inviting New Users

Admins can invite new users who will have their role pre-assigned before registration.

1. Click the "Invite User" button (top right of the table)
2. Fill in the invitation form:
   - **Email Address** (required): The user's email
   - **Suggested Username** (optional): Pre-filled during signup
   - **Assign Role**: Select from available roles
   - **Community** (optional): Pre-assign to a specific tenant
3. Click "Send Invite"

The invited user will receive an email with a registration link. Upon completing signup, their role is automatically assigned.

### Managing Pending Invitations

Below the user table, a collapsible "Pending Invitations" section shows:
- Email addresses with pending invites
- Assigned role
- When the invitation was sent
- Revoke button to cancel the invitation

---

## Events Tab

Manage scheduled competitions, quests, and gaming events.

### Creating an Event

1. Click "Create Event"
2. Fill in event details:
   - Title and description
   - Event type (Quest or Head-to-Head)
   - Scheduled start/end times
   - Registration deadline
   - Participant limits (min/max)
   - Associated Work Order (optional)
   - Community/Tenant assignment (optional)

### Event Statuses

Events progress through these lifecycle stages:

| Status | Description |
|--------|-------------|
| Draft | Event is being prepared, not visible to users |
| Published | Event is visible but registration not yet open |
| Registration Open | Users can register for the event |
| In Progress | Event is currently running |
| Completed | Event has finished |
| Cancelled | Event was cancelled |

You can change status directly from the table using the status dropdown.

### Filtering Events

Use the filter dropdowns to narrow by:
- Status (Draft, Published, Registration Open, etc.)
- Type (Quest vs Head-to-Head)

---

## Work Orders Tab

Work Orders are repeatable training scenarios tied to simulation games.

### Creating a Work Order

1. Click "Create Work Order"
2. Configure the work order:
   - **Title** and **Description**
   - **Game Title**: ATS, Farming Sim, Construction Sim, Mechanic Sim, or Fiber-Tech
   - **Difficulty**: Beginner, Intermediate, or Advanced
   - **XP Reward**: Points awarded upon completion
   - **Estimated Time** (minutes)
   - **Max Attempts** (optional limit)
   - **Success Criteria** (JSON configuration)
   - **Evidence Requirements** (optional):
     - Enable/disable evidence uploads
     - Allowed file types (images, videos, documents)
     - Min/max upload counts
     - Instructions for users
   - **Community/Tenant Assignment** (optional)
   - **Cover Image** (optional)

### Managing Work Orders

- **Toggle Active/Inactive**: Use the switch to enable/disable a work order
- **Edit**: Click the pencil icon to modify settings
- **Delete**: Click the trash icon (requires confirmation)

### Filtering Work Orders

Filter by:
- Game title
- Difficulty level

---

## Evidence Review Tab

Review evidence submitted by users for work order completions.

### Review Queue

The queue shows submissions with:
- User information
- Associated work order
- File details (type, name, size)
- Submission timestamp
- Current status

### Review Actions

Click "Review" to open a submission. You can:
- **Approve**: Mark the evidence as acceptable
- **Reject**: Deny the submission with a reason
- **Request Revision**: Ask the user to resubmit with feedback

### Evidence Statuses

| Status | Description |
|--------|-------------|
| Pending | Awaiting review |
| Approved | Evidence accepted |
| Rejected | Evidence denied |
| Needs Revision | User asked to resubmit |

The tab shows a badge count of pending submissions requiring attention.

---

## SIM Games Tab

Configure the simulation games available on the platform.

### Game Channels

Each game is represented as a "channel" with:
- Name and description
- Accent color for branding
- Cover image
- Subscriber count
- Work order count

### Managing Game Channels

1. Click "Add Game Channel" to create a new one
2. Select the game title (each game can only have one channel)
3. Customize the display name, description, and accent color
4. Optionally add a cover image

Edit existing channels by clicking the pencil icon on each card.

---

## SIM Resources Tab

Manage external learning resources linked to each simulation game.

### Adding Resources

1. Click "Add Resource"
2. Fill in the resource details:
   - **Title** and **Description**
   - **Game Title**: Which game this resource applies to
   - **URL**: External link to the resource
   - **Icon**: Choose from available icons
   - **Accent Color**: Visual styling

### Resource Display

Resources are grouped by game with visual indicators showing:
- Active/inactive status (toggle switch)
- External link preview
- Quick actions (edit, delete)

---

## Media Library Tab

Centralized management for platform images, videos, and audio.

### Media Types

- **Images**: Static images for heroes, cards, backgrounds
- **YouTube**: Embedded YouTube videos
- **Video**: Uploaded video files
- **Audio**: Sound clips and music

### Adding Media

1. Click "Add Media"
2. Select the media type
3. Provide:
   - **Title** for identification
   - **Location Key**: Where this media appears (e.g., `home_hero`, `admin_hero`)
   - **URL/Source**: The media source
   - **Alt Text**: Accessibility description

### Managing Media

- Filter by type using the filter buttons
- Search by title or location key
- Toggle active/inactive status
- Edit or delete media items

---

## Registration Codes Tab

Manage promotional/invitation codes for user registration.

### Creating Codes

1. Click the "+" button to create a new code
2. Configure:
   - **Code**: Auto-generate or enter manually
   - **Description**: Internal note about the code's purpose
   - **Tenant/Community**: Optional assignment
   - **Max Uses**: Limit redemptions (leave empty for unlimited)
   - **Expiration Date**: When the code becomes invalid

### Code Statuses

| Status | Description |
|--------|-------------|
| Active | Code is usable |
| Inactive | Manually disabled |
| Expired | Past expiration date |
| Exhausted | Max uses reached |

### Bulk Operations

Select multiple codes using checkboxes to:
- Bulk Activate
- Bulk Deactivate
- Bulk Delete

All bulk operations require confirmation.

### Exporting Data

Click the export button to download a CSV of registration codes for reporting.

---

## Super Admin-Only Features

The following tabs are only visible to users with the `super_admin` role.

### Community Review Tab

Review and approve community submissions from users.

Communities enter a "pending" state when created and must be approved before becoming visible on the platform.

**Review Actions:**
- **Approve**: Make the community visible
- **Reject**: Deny with reason
- **Request Revision**: Ask for changes

### Authorized Apps Tab

Manage external applications that can access the Credential API.

**Creating an App:**
1. Click "Add App"
2. Provide app name and slug
3. Configure allowed origins (CORS domains)
4. Set permissions:
   - Can Read Credentials
   - Can Issue Credentials
5. Specify allowed credential types

**API Key Management:**
- Click "Regenerate Key" to create a new API key
- Keys are shown once and must be copied immediately

### Credential Types Tab

Define the types of credentials (achievements, certifications) that can be issued.

**Creating a Credential Type:**
1. Click "Add Type"
2. Configure:
   - Display name and type key
   - Description
   - Associated game (optional)
   - Icon and accent color
   - Issuer app slug
   - Skills granted

### Discord Tab

Manage Discord account connections for platform users.

**Features:**
- View all connected Discord accounts
- Search by username or Discord ID
- Toggle connection active/inactive
- Force disconnect users
- View detailed connection information (scopes, sync status)

---

## Super Admin Panel

The dedicated Super Admin panel provides platform-wide management with four sub-tabs:

### Tenants Tab

Full CRUD management for communities/organizations.

**Views:**
- **List View**: Table with all tenants showing name, parent, level, category, members, and status
- **Tree View**: Hierarchical visualization of parent-child relationships

**Creating a Tenant:**
1. Click "Create Tenant"
2. Fill in name, slug, description
3. Select category type and brand color
4. Optionally assign parent tenant
5. Set hierarchy level

**Bulk Operations:**
Select multiple tenants for bulk deletion.

### Roles Tab

Role escalation controls for managing user permissions at scale.

### Audit Logs Tab

View system-wide activity logs with real-time updates.

**Features:**
- Filter by action type (create, update, delete, role_change, etc.)
- Filter by resource type
- Date range filtering
- Pagination with configurable page size (5/10/25/50)
- New entries highlight with visual animation

**Logged Actions Include:**
- Role changes
- Resource creation/updates/deletion
- Bulk operations
- Code redemptions

### Danger Zone Tab

Irreversible high-impact operations with confirmation requirements.

**Available Operations:**

1. **Purge Inactive User Data**
   - Removes data for users inactive for 1+ year
   - Preserves user accounts
   - Confirmation: Type `PURGE INACTIVE`

2. **Reset All User Progress**
   - Clears lesson progress, enrollments, and completions for ALL users
   - Confirmation: Type `RESET ALL PROGRESS`

3. **Clear Audit Logs**
   - Deletes audit logs older than 90 days
   - Preserves recent logs
   - Confirmation: Type `CLEAR OLD LOGS`

All dangerous operations are logged to the audit trail.

---

## Common Actions Reference

| Action | Location | Who Can Do It |
|--------|----------|---------------|
| Invite a new user | User Management > Invite User | Admin, Super Admin |
| Change user role | User Management > Manage Role | Admin, Super Admin |
| Create work order | Work Orders > Create Work Order | Admin, Super Admin |
| Review evidence | Evidence Review > Review | Admin, Super Admin |
| Create event | Events > Create Event | Admin, Super Admin |
| Manage media | Media Library | Admin, Super Admin |
| Manage registration codes | Registration Codes | Admin, Super Admin |
| Review communities | Community Review | Super Admin only |
| Manage tenants | Super Admin > Tenants | Super Admin only |
| View audit logs | Super Admin > Audit Logs | Super Admin only |
| Execute dangerous operations | Super Admin > Danger Zone | Super Admin only |

---

## Keyboard Shortcuts

Currently, the admin panel does not have dedicated keyboard shortcuts. Use standard browser navigation (Tab, Enter) for accessibility.

---

## Troubleshooting

### "Access Denied" when accessing /admin
- Verify you have an admin or super_admin role
- Check with a super admin to have your role assigned

### Changes not saving
- Check browser console for error messages
- Ensure you have network connectivity
- Verify the record isn't locked by another process

### Evidence files not loading
- Check if the file URL is accessible
- Verify storage bucket permissions
- Try refreshing the page

### Invitations not being sent
- Verify email configuration is set up
- Check that the email address is valid
- Review edge function logs for errors

---

## Summary

This Admin User Guide covers all functionality available in the FGN Academy Admin Dashboard. For technical API documentation, see the Developer Portal. For questions not covered here, contact the platform development team.

