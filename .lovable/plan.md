
# Gap Analysis: FGN Academy vs SimGrid + Community & Embed Features

## Executive Summary

This plan addresses three major requirements:
1. Feature gaps between FGN Academy and SimGrid (simulation racing platform)
2. Embeddable leaderboards that admins can push to external websites
3. Active "Create Community" button with categorization by geography, broadband provider, and trade skill tracks

---

## Part 1: SimGrid Feature Gap Analysis

### What SimGrid Has That FGN Academy is Missing

| Feature | SimGrid | FGN Academy | Priority |
|---------|---------|-------------|----------|
| **Ranked/Quick Race** | Real-time matchmaking queue | No live matchmaking | Low (different domain) |
| **Championships/Seasons** | Multi-round event series | Single work orders | Medium |
| **Grid Rank** | Skill-based rating system | Basic score only | High |
| **Event Registration** | Sign-up with slots/capacity | No capacity limits | Medium |
| **Discord Integration** | OAuth login via Discord | Email only | Medium |
| **Platform Tags** | PC/Console/Crossplay badges | No platform info | Low |
| **Community Discovery** | Rich community cards with event counts | Basic community cards | High |
| **Embeddable Widgets** | Results/standings widgets | None | Critical |
| **Event Scheduling** | Recurring events with countdowns | Static work orders | Medium |

### Features FGN Academy Already Has (Advantage)

| Feature | Description |
|---------|-------------|
| XP/Points System | Full ledger with multipliers |
| Skill Passport | Verifiable credentials |
| Course LMS | Structured learning paths |
| Achievement System | Badges and achievements |
| Work Order Completion | Tracked attempts with scores |

---

## Part 2: Community Creation System

### Current State
- `tenants` table exists with: name, slug, brand_color, logo_url, game_titles
- "Create Community" button is present but has no `onClick` handler
- No categorization fields exist

### Required Database Changes

**Extend `tenants` table with new columns:**

| Column | Type | Description |
|--------|------|-------------|
| `category_type` | enum | 'geography', 'broadband_provider', 'trade_skill' |
| `description` | text | Community description |
| `cover_image_url` | text | Banner image |
| `website_url` | text | External link |
| `location` | text | For geography-based communities |
| `is_verified` | boolean | Admin-verified badge |
| `member_count` | integer | Cached count |
| `owner_id` | uuid | Creator/admin of community |

**Create `community_memberships` table:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to profiles |
| `tenant_id` | uuid | FK to tenants |
| `role` | enum | 'member', 'moderator', 'admin' |
| `joined_at` | timestamp | When joined |

### New Components

1. **CreateCommunityDialog** - Modal form for admins to create communities
   - Name, slug, description
   - Category type selector (Geography / Broadband / Trade Skill)
   - Sub-category based on type:
     - Geography: State/Region dropdown
     - Broadband: Provider selection (Cox, Comcast, etc.)
     - Trade Skill: Track selection (Trucking, Farming, Construction, Mechanic)
   - Logo upload
   - Brand color picker

2. **CommunityFilterBar** - Filter communities by category type

---

## Part 3: Embeddable Leaderboard System

### Architecture Overview

```text
+------------------+     +--------------------+     +------------------+
|  Admin Dashboard |     |   leaderboard_     |     |  Public Embed    |
|  (Generate Code) |---->|   embed_configs    |---->|  /embed/:token   |
+------------------+     +--------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |  Leaderboard     |
                         |  Data Query      |
                         +------------------+
```

### Database Schema

**Create `leaderboard_embed_configs` table:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK to tenants (optional, null = global) |
| `work_order_id` | uuid | FK to work_orders (optional) |
| `game_title` | game_title | Filter by game (optional) |
| `title` | text | Custom title for the embed |
| `display_count` | integer | Number of entries to show (5, 10, 25) |
| `theme` | text | 'dark', 'light', 'auto' |
| `show_avatars` | boolean | Display user avatars |
| `show_change` | boolean | Show rank change arrows |
| `embed_token` | text | Unique public token |
| `is_active` | boolean | Enable/disable embed |
| `created_by` | uuid | Admin who created |
| `created_at` | timestamp | Creation time |
| `expires_at` | timestamp | Optional expiration |

### Implementation Components

1. **LeaderboardEmbedManager** (Admin tab)
   - List existing embed configurations
   - Create new embed with settings
   - Copy embed code (iframe + script)
   - Preview embed
   - Enable/disable embeds

2. **LeaderboardEmbedDialog** (Create/Edit form)
   - Scope selector (Global / Community / Work Order / Game)
   - Display options (count, avatars, theme)
   - Custom title
   - Generate preview

3. **EmbedLeaderboard** (Public route: `/embed/leaderboard/:token`)
   - Standalone React component
   - Fetches data from public API
   - Responsive design for iframe embedding
   - CSS isolation to prevent host site conflicts

### Embed Code Output

```html
<!-- FGN Academy Leaderboard Widget -->
<iframe
  src="https://fgn-academy.lovable.app/embed/leaderboard/abc123xyz"
  width="400"
  height="500"
  frameborder="0"
  style="border-radius: 8px; overflow: hidden;"
  title="FGN Academy Leaderboard"
></iframe>
```

---

## Implementation Plan

### Phase 1: Database Schema Updates

1. Add community categorization columns to `tenants`:
   - `category_type` enum: 'geography', 'broadband_provider', 'trade_skill'
   - `description`, `cover_image_url`, `website_url`, `location`
   - `is_verified`, `member_count`, `owner_id`

2. Create `community_memberships` table for user-community relationships

3. Create `leaderboard_embed_configs` table for embed settings

4. Set up RLS policies:
   - Admins can create/edit communities and embeds
   - Public can read embed configs by token
   - Users can join communities

### Phase 2: Community Creation UI

1. **CreateCommunityDialog.tsx**
   - Form with category type selector
   - Dynamic sub-fields based on category
   - Image upload integration
   - Validation and submission

2. **Update Communities.tsx**
   - Wire up "Create Community" button (admin-only)
   - Add category filter tabs

3. **Update CommunityCard.tsx**
   - Display category badge
   - Show member count
   - Show verified status

4. **Update CommunityProfile.tsx**
   - Display full description
   - Show category information
   - Join/Leave functionality

### Phase 3: Embeddable Leaderboards

1. **Add Embed Tab to Admin Dashboard**
   - New tab: "Embed Widgets"
   - List of existing embed configurations
   - Create new embed button

2. **LeaderboardEmbedDialog.tsx**
   - Scope selection (Global/Community/Work Order/Game)
   - Style configuration
   - Preview pane
   - Generate embed code

3. **Public Embed Route**
   - New route: `/embed/leaderboard/:token`
   - Standalone page with minimal wrapper
   - Query leaderboard data based on config
   - Render compact leaderboard UI

4. **EmbedLeaderboard.tsx**
   - Self-contained component
   - Dark/light theme support
   - Responsive sizing
   - Auto-refresh option

### Phase 4: Hook & Service Layer

1. **useCommunities.ts** (enhance)
   - `createCommunity(data)`
   - `joinCommunity(tenantId)`
   - `leaveCommunity(tenantId)`
   - `filterByCategory(type)`

2. **useLeaderboardEmbed.ts** (new)
   - `createEmbed(config)`
   - `updateEmbed(id, config)`
   - `deleteEmbed(id)`
   - `getEmbedByToken(token)`

3. **useLeaderboardData.ts** (new)
   - `getLeaderboard(scope, filters)`
   - Supports global, community, work order, game filtering

---

## File Changes Summary

### New Files

```text
src/components/admin/LeaderboardEmbedManager.tsx
src/components/admin/LeaderboardEmbedDialog.tsx
src/components/admin/CreateCommunityDialog.tsx
src/components/embed/EmbedLeaderboard.tsx
src/pages/EmbedLeaderboard.tsx
src/hooks/useCommunities.ts
src/hooks/useLeaderboardEmbed.ts
src/hooks/useLeaderboardData.ts
```

### Modified Files

```text
src/pages/Admin.tsx
  - Add "Embed Widgets" tab
  - Add community management controls

src/pages/Communities.tsx
  - Wire "Create Community" button with dialog
  - Add category filter tabs

src/components/marketplace/CommunityCard.tsx
  - Add category badge
  - Add member count display

src/components/marketplace/PageHero.tsx
  - Ensure onClick handler is passed through

src/types/tenant.ts
  - Add new Tenant fields
  - Add CommunityMembership interface
  - Add LeaderboardEmbedConfig interface

src/App.tsx
  - Add embed route: /embed/leaderboard/:token
```

---

## Technical Notes

### Community Category Types

| Type | Examples |
|------|----------|
| Geography | Texas Region, California Bay Area, Northeast Corridor |
| Broadband Provider | Cox Broadband, Comcast, AT&T Fiber |
| Trade Skill | Commercial Trucking, Heavy Equipment, Precision Agriculture |

### Embed Security

- Tokens are UUIDs, not guessable
- RLS ensures only public data is exposed
- Optional expiration for time-limited embeds
- Admins can disable embeds instantly

### Embed Styling

- CSS variables for theming
- Shadow DOM consideration for isolation (optional)
- Responsive breakpoints for various embed sizes
- Minimal external dependencies

---

## Summary

This plan delivers:

1. **Active Community Creation** - Admins can create communities categorized by geography, broadband provider, or trade skill track

2. **Embeddable Leaderboards** - Admins can generate iframe embed codes for leaderboards scoped to global, community, work order, or game level

3. **SimGrid Parity** - Improved community cards, member counts, and the foundation for championships/seasons (future phase)

The implementation uses the existing database patterns and authentication system while adding focused new capabilities for community management and external widget distribution.
