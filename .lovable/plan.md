
# Plan: Discord OAuth Integration (Secrets Deferred)

## Overview

Continue implementing the Discord OAuth integration, deferring secrets configuration for later. This plan includes all frontend components, edge function (which will gracefully handle missing credentials), and a dedicated **Admin Discord Management** tab for super admins to view and manage all user Discord connections.

---

## Architecture Update

```text
ADMIN DISCORD MANAGEMENT
────────────────────────────────────────────────────────────────────

Super Admin navigates to Admin → Discord Connections tab
        │
        ▼
View all linked Discord accounts across users
  • Username, Discord ID, connection status
  • Filter by active/inactive, search by username
        │
        ▼
Admin actions available:
  ├── View connection details (Discord profile, scopes)
  ├── Force disconnect a user's Discord link
  ├── Toggle connection active/inactive status
  └── View audit log of connection changes
```

---

## Database Changes

### Add RLS Policy for Admin Access

```sql
-- Super admins can view all Discord connections
CREATE POLICY "Super admins can view all discord connections"
ON user_discord_connections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Super admins can update Discord connections (toggle active status)
CREATE POLICY "Super admins can update discord connections"
ON user_discord_connections FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Super admins can delete any Discord connection
CREATE POLICY "Super admins can delete any discord connection"
ON user_discord_connections FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/discord-oauth/index.ts` | Edge function for OAuth token exchange (gracefully handles missing secrets) |
| `src/hooks/useDiscordConnection.ts` | Hook for user's own Discord connection state |
| `src/hooks/useAdminDiscordConnections.ts` | Hook for admin to manage all Discord connections |
| `src/components/settings/DiscordConnectionCard.tsx` | User-facing connect/disconnect UI |
| `src/components/admin/DiscordConnectionsManager.tsx` | Admin table to view/manage all connections |
| `src/pages/AuthDiscordCallback.tsx` | Callback page handling Discord redirect |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/auth/discord/callback` route |
| `src/pages/Settings.tsx` | Add DiscordConnectionCard to settings |
| `src/pages/Admin.tsx` | Add "Discord" tab (super admin only) |
| `src/components/profile/ProfileHeader.tsx` | Show Discord badge if connected |
| `src/components/onboarding/AcademyOnboardingDialog.tsx` | Replace manual input with OAuth prompt |

---

## Implementation Details

### 1. Edge Function: discord-oauth

The edge function will check for credentials at runtime and return helpful error messages when secrets are not configured:

```typescript
// supabase/functions/discord-oauth/index.ts

// Key behavior:
// - If DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET missing → return 503 with setup instructions
// - POST /connect → Exchange code for tokens, store connection
// - POST /refresh → Refresh expired access token
// - GET /status → Check if Discord integration is configured

// Graceful handling example:
const clientId = Deno.env.get('DISCORD_CLIENT_ID');
const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');

if (!clientId || !clientSecret) {
  return new Response(
    JSON.stringify({ 
      error: 'Discord integration not configured',
      configured: false,
      message: 'Admin needs to add Discord credentials in settings'
    }),
    { status: 503 }
  );
}
```

### 2. useDiscordConnection Hook

```typescript
interface UseDiscordConnectionReturn {
  connection: DiscordConnection | null;
  isLoading: boolean;
  isConfigured: boolean;  // New: checks if Discord OAuth is set up
  isConnecting: boolean;
  isDisconnecting: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  checkConfiguration: () => Promise<boolean>;
}
```

### 3. Admin Discord Connections Manager

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Discord Connections                              [X Connected] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Search users...]                         Status: [All ▼]  Per page: [10 ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│  USER           │ DISCORD ACCOUNT     │ CONNECTED     │ STATUS   │ ACTIONS  │
├─────────────────┼─────────────────────┼───────────────┼──────────┼──────────┤
│  [Avatar] John  │ @johndoe#0          │ Jan 15, 2026  │ [Active] │ [⋮]      │
│  [Avatar] Jane  │ @janesmith          │ Feb 1, 2026   │ [Active] │ [⋮]      │
│  [Avatar] Bob   │ @bobgamer#1234      │ Dec 20, 2025  │ [Inactive]│ [⋮]     │
└─────────────────────────────────────────────────────────────────────────────┘
                                                     [< 1 2 3 ... 10 >]
```

Action menu options:
- View Details (dialog with full Discord profile)
- Toggle Active/Inactive
- Force Disconnect (with confirmation)

### 4. DiscordConnectionCard (User Settings)

Displays different states:
- **Not Configured**: Shows message that Discord integration is pending admin setup
- **Not Connected**: Shows "Connect Discord" button
- **Connected**: Shows Discord profile with disconnect option

```typescript
// When not configured by admin
if (!isConfigured) {
  return (
    <Card>
      <CardContent>
        <p>Discord integration coming soon!</p>
        <p className="text-muted-foreground">
          This feature is being set up by administrators.
        </p>
      </CardContent>
    </Card>
  );
}
```

### 5. Profile Header Integration

When Discord is connected, show a Discord badge:

```typescript
// In ProfileHeader
{discordConnection && (
  <Badge variant="outline" className="bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2]">
    <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24">
      {/* Discord logo SVG */}
    </svg>
    @{discordConnection.username}
  </Badge>
)}
```

### 6. Onboarding Dialog Update

Replace manual Discord ID input with OAuth prompt:

```typescript
// Before (manual)
<Input placeholder="username#1234" />

// After (OAuth-aware)
{isDiscordConfigured ? (
  <Button variant="outline" onClick={connectDiscord}>
    <DiscordIcon className="mr-2" />
    Connect Discord Account
  </Button>
) : (
  <div className="text-muted-foreground text-sm">
    Discord integration coming soon
  </div>
)}
```

---

## Admin Tab Integration

Add to Admin.tsx tabs (super admin only):

```typescript
{isSuperAdmin && (
  <TabsTrigger 
    value="discord" 
    className="text-[#5865F2] data-[state=active]:text-[#5865F2]"
  >
    Discord Connections
  </TabsTrigger>
)}

<TabsContent value="discord">
  <Card className="border-border/50">
    <CardContent className="pt-6">
      <DiscordConnectionsManager />
    </CardContent>
  </Card>
</TabsContent>
```

---

## Environment Variables

### Frontend (public, safe to commit)
```
VITE_DISCORD_CLIENT_ID=  # Added later by admin
```

### Edge Function Secrets (added later)
```
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

---

## Graceful Degradation

The system will work in three modes:

| Mode | Behavior |
|------|----------|
| **Not Configured** | Edge function returns 503; UI shows "coming soon" |
| **Partially Configured** | Edge function validates; shows appropriate errors |
| **Fully Configured** | Complete OAuth flow works |

This allows deployment without secrets while providing clear feedback to users and admins.

---

## Implementation Order

1. **Database Migration**: Add admin RLS policies for Discord connections
2. **Edge Function**: Create `discord-oauth` with graceful secret handling
3. **Hooks**: Create `useDiscordConnection` and `useAdminDiscordConnections`
4. **User UI**: Create `DiscordConnectionCard` for Settings page
5. **Admin UI**: Create `DiscordConnectionsManager` for Admin dashboard
6. **Callback Page**: Create `/auth/discord/callback` route
7. **Integration**: Update Admin.tsx, Settings.tsx, ProfileHeader, and onboarding
8. **Testing**: Verify graceful handling when secrets are missing

---

## Summary

This implementation:

1. **Proceeds Without Secrets** - All code deployed; works in degraded mode until configured
2. **Admin Management** - Super admins can view/manage all Discord connections
3. **User Self-Service** - Users can connect/disconnect from Settings when enabled
4. **Clear Feedback** - Users see appropriate messaging based on configuration state
5. **Security** - Admin-only policies for viewing all connections
6. **Audit Trail** - Connection metadata tracked (connected_at, last_synced_at)
