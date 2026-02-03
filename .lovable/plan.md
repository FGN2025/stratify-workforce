# Plan: Discord OAuth Integration

## Status: ✅ COMPLETE

All components have been implemented and deployed.

---

## Implemented Features

### 1. Database Schema
- ✅ `user_discord_connections` table with OAuth tokens and Discord profile data
- ✅ RLS policies for user self-management
- ✅ RLS policies for super admin management

### 2. Edge Function
- ✅ `discord-oauth` deployed with endpoints:
  - `GET /status` - Check if Discord OAuth is configured
  - `POST /connect` - Exchange authorization code for tokens
  - `POST /refresh` - Refresh expired access token
  - `DELETE /disconnect` - Remove Discord connection
- ✅ Graceful handling when secrets are not configured (returns 503)

### 3. Frontend Components
- ✅ `useDiscordConnection` hook for user's connection state
- ✅ `useAdminDiscordConnections` hook for admin management
- ✅ `DiscordConnectionCard` in Settings page
- ✅ `DiscordConnectionsManager` in Admin dashboard (Discord tab)
- ✅ `AuthDiscordCallback` page for OAuth redirect handling
- ✅ Discord badge in `ProfileHeader` when connected

### 4. Integration Points
- ✅ `/auth/discord/callback` route in App.tsx
- ✅ Discord card in Settings page
- ✅ Discord tab in Admin page (super admin only)
- ✅ Profile header shows Discord username badge

---

## Pending Configuration (User Action Required)

### Discord Developer Portal Setup
1. Go to https://discord.com/developers/applications
2. Create a new application (or use existing)
3. Navigate to OAuth2 → General
4. Add Redirect URLs:
   - `https://id-preview--bdc55f68-6a4e-4a85-ae3a-8b5181141ddf.lovable.app/auth/discord/callback`
   - `https://stratify-workforce.lovable.app/auth/discord/callback`
5. Copy Client ID and Client Secret

### Secrets to Add
When ready, add these secrets in Lovable:
- `DISCORD_CLIENT_ID` - From Discord Developer Portal
- `DISCORD_CLIENT_SECRET` - From Discord Developer Portal

### Frontend Environment
Add to environment (for OAuth URL construction):
- `VITE_DISCORD_CLIENT_ID` - Same Client ID

---

## Architecture

```
User → Settings → "Connect Discord" button
  ↓
Discord OAuth consent screen (scopes: identify, guilds, guilds.members.read)
  ↓
Redirect to /auth/discord/callback?code=xxx&state=xxx
  ↓
AuthDiscordCallback page → calls discord-oauth edge function
  ↓
Edge function exchanges code for tokens, fetches Discord profile
  ↓
Stores tokens + profile in user_discord_connections
  ↓
Redirect back to /settings with success toast
```

---

## Admin Features

Super admins can:
- View all Discord connections across users
- Toggle connection active/inactive status
- Force disconnect any user's Discord link
- View connection details (Discord ID, scopes, timestamps)
- Search/filter connections

---

## Graceful Degradation

| Mode | Behavior |
|------|----------|
| **Not Configured** | Edge function returns 503; UI shows "Coming Soon" |
| **Configured** | Full OAuth flow works |

---

## Future Enhancements (Not Implemented)

1. Discord Embeds - Embed community Discord servers in app
2. Role Sync - Auto-assign FGN roles based on Discord roles
3. Notifications - Send Discord DMs for events/achievements
4. Server Widget - Display live server activity
5. Rich Presence - Show FGN activity in Discord status
