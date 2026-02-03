
# Plan: Discord Account Linking via OAuth

## Overview

Implement a complete Discord OAuth flow allowing users to permanently link their Discord account to their FGN Academy profile. This replaces the current manual text field with a verified, token-based connection that enables rich Discord data access.

---

## Architecture

```text
DISCORD OAUTH FLOW
────────────────────────────────────────────────────────────────────

User visits Settings or Profile page
        │
        ▼
Clicks "Connect Discord" button
        │
        ▼
Redirected to Discord OAuth consent screen
  • App requests scopes: identify, guilds, guilds.members.read
        │
        ▼
User authorizes → Discord redirects to callback URL
  • URL: /auth/discord/callback?code=xxx
        │
        ▼
Frontend extracts code, calls Edge Function
  • POST /discord-oauth with { code, redirect_uri }
        │
        ▼
Edge Function exchanges code for tokens with Discord
        │
        ▼
Edge Function fetches Discord user profile
        │
        ▼
Stores tokens + profile in user_discord_connections table
        │
        ▼
Returns success → Frontend shows connected state


SUBSEQUENT DATA ACCESS
────────────────────────────────────────────────────────────────────

User profile loads
        │
        ▼
Check user_discord_connections for linked account
        │
        ▼
If connected:
  ├── Display Discord username, avatar, discriminator
  ├── Show "Disconnect" option
  └── (Future) Sync guild memberships, roles
```

---

## Database Schema

### New Table: user_discord_connections

```sql
CREATE TABLE public.user_discord_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Discord Identity
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,  -- May be '0' for new usernames
  discord_avatar_hash TEXT,
  discord_banner_hash TEXT,
  discord_accent_color INTEGER,
  discord_global_name TEXT,
  
  -- OAuth Tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['identify'],
  
  -- Metadata
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discord_connections_user ON user_discord_connections(user_id);
CREATE INDEX idx_discord_connections_discord_id ON user_discord_connections(discord_id);

-- Updated at trigger
CREATE TRIGGER update_discord_connections_updated_at
  BEFORE UPDATE ON user_discord_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE user_discord_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connection
CREATE POLICY "Users can view own discord connection"
ON user_discord_connections FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own connection (disconnect)
CREATE POLICY "Users can disconnect own discord"
ON user_discord_connections FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Only edge functions (service role) can insert/update
-- No INSERT/UPDATE policies for authenticated users
```

---

## Discord OAuth Configuration

### Required Secrets

| Secret Name | Purpose |
|-------------|---------|
| `DISCORD_CLIENT_ID` | Discord application Client ID |
| `DISCORD_CLIENT_SECRET` | Discord application Client Secret |

### Discord Developer Portal Setup (User Action Required)

1. Go to https://discord.com/developers/applications
2. Create a new application (or use existing)
3. Navigate to OAuth2 → General
4. Add Redirect URL: `https://id-preview--bdc55f68-6a4e-4a85-ae3a-8b5181141ddf.lovable.app/auth/discord/callback`
5. Add Redirect URL: `https://stratify-workforce.lovable.app/auth/discord/callback`
6. Copy Client ID and Client Secret
7. Save as secrets in Lovable

### OAuth Scopes

| Scope | Data Provided |
|-------|---------------|
| `identify` | User ID, username, avatar, banner, accent color |
| `guilds` | List of servers user is in |
| `guilds.members.read` | Roles/nickname in mutual servers |

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/discord-oauth/index.ts` | Edge function handling OAuth token exchange and user data fetch |
| `src/hooks/useDiscordConnection.ts` | Hook for managing Discord connection state |
| `src/components/settings/DiscordConnectionCard.tsx` | UI component for connect/disconnect flow |
| `src/pages/AuthDiscordCallback.tsx` | Callback page that handles Discord redirect |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/auth/discord/callback` route |
| `src/pages/Settings.tsx` | Add Discord connection card to settings |
| `src/pages/Profile.tsx` | Display Discord info if connected |
| `src/components/profile/ProfileHeader.tsx` | Show Discord badge/link if connected |
| `src/components/onboarding/AcademyOnboardingDialog.tsx` | Update Discord field to show "Connect via OAuth" option |

---

## Implementation Details

### 1. Edge Function: discord-oauth

```typescript
// supabase/functions/discord-oauth/index.ts

// Endpoints:
// POST /connect - Exchange code for tokens, store connection
// POST /refresh - Refresh expired access token
// DELETE /disconnect - Remove connection
// GET /me - Get current connection status

// Token Exchange Flow:
// 1. Receive authorization code from frontend
// 2. Exchange code for access_token + refresh_token with Discord
// 3. Use access_token to fetch user profile from Discord API
// 4. Store everything in user_discord_connections
// 5. Return success with Discord profile data
```

### 2. useDiscordConnection Hook

```typescript
interface DiscordConnection {
  discordId: string;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
  globalName: string | null;
  connectedAt: string;
  isActive: boolean;
}

interface UseDiscordConnectionReturn {
  connection: DiscordConnection | null;
  isLoading: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  connect: () => void;  // Redirects to Discord OAuth
  disconnect: () => Promise<void>;
  getAvatarUrl: () => string | null;
}
```

### 3. DiscordConnectionCard Component

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Discord Logo] Discord                                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  NOT CONNECTED                                             │ │
│  │                                                            │ │
│  │  Link your Discord account to access community features,  │ │
│  │  display your Discord profile, and sync server roles.     │ │
│  │                                                            │ │
│  │                            [Connect Discord]               │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [Discord Logo] Discord                        [Connected ✓]   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  [Avatar]  @username                                       │ │
│  │            Connected Feb 3, 2026                           │ │
│  │                                                            │ │
│  │  Permissions:                                              │ │
│  │  ✓ Basic profile info                                     │ │
│  │  ✓ Server list                                            │ │
│  │  ✓ Server roles                                           │ │
│  │                                                            │ │
│  │                            [Disconnect]                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4. AuthDiscordCallback Page

```typescript
// Handles: /auth/discord/callback?code=xxx&state=xxx
// 1. Extract code and state from URL
// 2. Validate state matches stored value (CSRF protection)
// 3. Call edge function with code
// 4. On success: redirect to /settings with success toast
// 5. On error: redirect to /settings with error toast
```

### 5. Profile Integration

When Discord is connected:
- Show Discord logo/badge next to username
- Display Discord avatar as secondary avatar option
- Show "View on Discord" link
- Display Discord username in profile header

---

## OAuth URL Construction

```typescript
const DISCORD_OAUTH_URL = 'https://discord.com/oauth2/authorize';

function buildDiscordOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/discord/callback`,
    response_type: 'code',
    scope: 'identify guilds guilds.members.read',
    state: state,  // CSRF protection
    prompt: 'consent',  // Always show consent screen
  });
  
  return `${DISCORD_OAUTH_URL}?${params.toString()}`;
}
```

---

## Token Refresh Strategy

```text
ACCESS TOKEN LIFECYCLE
────────────────────────────────────────────────────────────────────

Access tokens expire after ~7 days (Discord default)
        │
        ▼
On any Discord API call, check token_expires_at
        │
        ├── If valid: proceed with request
        │
        └── If expired/expiring soon:
                │
                ▼
            Call Discord refresh endpoint
                │
                ▼
            Update tokens in database
                │
                ▼
            Proceed with request
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| CSRF attacks | State parameter with crypto-random value stored in sessionStorage |
| Token exposure | Tokens stored only in database, never exposed to frontend |
| Unauthorized access | RLS policies prevent cross-user access |
| Token theft | Refresh tokens allow revocation; short-lived access tokens |
| Replay attacks | Single-use authorization codes (Discord enforces) |

---

## Data Available from Discord

| Data Point | Scope Required | Use Case |
|------------|----------------|----------|
| User ID | `identify` | Unique identifier for linking |
| Username | `identify` | Display in profile |
| Avatar | `identify` | Alternative profile picture |
| Banner | `identify` | Profile customization |
| Global Name | `identify` | Display name |
| Server List | `guilds` | Show mutual communities |
| Server Roles | `guilds.members.read` | Auto-assign community roles |

---

## Future Enhancements (Not in Initial Scope)

1. **Discord Embeds**: Embed community Discord servers in app
2. **Role Sync**: Auto-assign FGN roles based on Discord roles
3. **Notifications**: Send Discord DMs for events/achievements
4. **Server Widget**: Display live server activity
5. **Rich Presence**: Show FGN activity in Discord status

---

## Environment Variables

### Frontend (.env - public)
```
VITE_DISCORD_CLIENT_ID=your_client_id_here
```

### Edge Function (Supabase Secrets)
```
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
```

---

## Implementation Order

1. **Database Migration**: Create `user_discord_connections` table with RLS
2. **Request Secrets**: Prompt for `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
3. **Edge Function**: Create `discord-oauth` with connect/disconnect/refresh endpoints
4. **Callback Page**: Create `/auth/discord/callback` route and handler
5. **Hook**: Create `useDiscordConnection` for state management
6. **Settings UI**: Add `DiscordConnectionCard` to Settings page
7. **Profile Integration**: Show Discord info in ProfileHeader
8. **Onboarding Update**: Replace manual field with OAuth prompt
9. **Testing**: End-to-end flow verification

---

## Summary

This implementation provides:

1. **Secure OAuth Flow** - Industry-standard token exchange via edge function
2. **Permanent Linking** - Tokens stored in database with refresh capability
3. **Rich Profile Data** - Username, avatar, banner, and server memberships
4. **User Control** - Connect/disconnect at any time from Settings
5. **Extensibility** - Foundation for Discord embeds, role sync, and notifications
6. **Privacy-First** - Minimal scopes, clear consent, easy revocation

