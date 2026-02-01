
# Game Channel Implementation Plan

## Overview

This plan creates dedicated channels for each simulator game (American Truck Simulator, Farming Simulator, Construction Simulator, Mechanic Simulator) where users can chat, share media, and connect with communities that use that game.

---

## Architecture Summary

```text
+------------------+     +------------------+     +------------------+
|   Game Channels  |     |   Channel Posts  |     |    Communities   |
+------------------+     +------------------+     +------------------+
| id               |<--->| id               |     | id               |
| game_title (PK)  |     | channel_game     |---->| game_titles[]    |
| name             |     | user_id          |     | (new column)     |
| description      |     | content          |     +------------------+
| cover_image_url  |     | media_urls[]     |
| accent_color     |     | likes_count      |
+------------------+     | created_at       |
                         +------------------+
```

---

## Database Changes

### 1. Create `game_channels` Table

A static reference table for each game channel:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `game_title` | game_title enum | Unique game identifier (ATS, Farming_Sim, etc.) |
| `name` | text | Display name (e.g., "American Truck Simulator") |
| `description` | text | Channel description |
| `cover_image_url` | text | Hero banner image |
| `accent_color` | text | Theme color (hex) |
| `member_count` | integer | Cached count of subscribers |
| `created_at` | timestamp | Creation date |

### 2. Create `channel_posts` Table

User-generated content within channels:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `channel_game` | game_title enum | Foreign key to channel |
| `user_id` | uuid | Author reference |
| `content` | text | Post text content |
| `media_urls` | text[] | Array of image/video URLs |
| `likes_count` | integer | Engagement metric |
| `created_at` | timestamp | Post date |

### 3. Create `channel_subscriptions` Table

Track user follows per channel:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Subscriber |
| `game_title` | game_title enum | Channel subscribed to |
| `created_at` | timestamp | Subscription date |

### 4. Add `game_titles` Column to `tenants` Table

Allow communities to be cross-referenced with multiple games:

```sql
ALTER TABLE tenants 
ADD COLUMN game_titles game_title[] DEFAULT '{}';
```

### 5. Row-Level Security Policies

- **game_channels**: Public read access
- **channel_posts**: Anyone can read; authenticated users can create/edit their own
- **channel_subscriptions**: Users can manage their own subscriptions

---

## New Pages and Routes

### 1. Channel Index Page (`/channels`)

A gallery view of all four game channels with:
- Hero cards for each simulator
- Subscriber counts and trending stats
- Quick links to each channel

### 2. Individual Channel Page (`/channel/:game`)

Routes like `/channel/ats`, `/channel/farming-sim`, etc., featuring:

- **Hero Section**: Full-width banner with game imagery
- **Stats Bar**: Subscribers, posts today, active communities
- **Community Cross-Reference**: Carousel of tenants that use this game
- **Feed Section**: User posts with text, images, and videos
- **Related Work Orders**: Horizontal carousel of events for this game

### 3. Post Creation Component

A composer for sharing content:
- Text input with markdown support
- Media upload (integrates with storage)
- Game channel selector (auto-filled when posting from channel page)

---

## UI Components to Create

| Component | Purpose |
|-----------|---------|
| `ChannelCard.tsx` | Large hero card for channel gallery |
| `ChannelHero.tsx` | Game-themed hero section for channel page |
| `ChannelFeed.tsx` | Post list with infinite scroll |
| `PostCard.tsx` | Individual post with media, likes, comments |
| `PostComposer.tsx` | Create new post form |
| `ChannelCommunities.tsx` | Cross-referenced communities carousel |

---

## Navigation Updates

Add "Channels" section to sidebar with sub-navigation:

```text
Channels
  - American Truck Sim
  - Farming Simulator
  - Construction Sim
  - Mechanic Simulator
```

---

## Cross-Referencing Logic

1. **Channel to Communities**: Query tenants where `game_titles` array contains the channel's game
2. **Community to Channels**: Display linked channels on community profile page
3. **Work Orders**: Already have `game_title` - filter by game on channel pages

---

## Technical Details

### File Structure

```text
src/
  components/
    channels/
      ChannelCard.tsx
      ChannelHero.tsx
      ChannelFeed.tsx
      PostCard.tsx
      PostComposer.tsx
      ChannelCommunities.tsx
  pages/
    Channels.tsx         (gallery: /channels)
    ChannelProfile.tsx   (detail: /channel/:game)
  types/
    channel.ts           (TypeScript interfaces)
```

### Routing Changes

```typescript
// App.tsx additions
<Route path="/channels" element={<Channels />} />
<Route path="/channel/:game" element={<ChannelProfile />} />
```

### Game Slug Mapping

```typescript
const gameSlugMap = {
  'ats': 'ATS',
  'farming-sim': 'Farming_Sim',
  'construction-sim': 'Construction_Sim',
  'mechanic-sim': 'Mechanic_Sim'
};
```

### Realtime Updates

Enable Supabase Realtime on `channel_posts` for live feed updates:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_posts;
```

---

## Implementation Order

1. **Database**: Create tables and RLS policies via migrations
2. **Types**: Add TypeScript interfaces for new tables
3. **Channel Gallery**: Build `/channels` page with channel cards
4. **Channel Profile**: Build `/channel/:game` page with hero and feed
5. **Post System**: Add PostCard and PostComposer components
6. **Cross-References**: Link communities to channels bidirectionally
7. **Navigation**: Update sidebar with channels section
8. **Realtime**: Enable live post updates

---

## Visual Design

Each channel will have a unique theme based on the existing `GameIcon` colors:

| Game | Accent Color | Visual Theme |
|------|-------------|--------------|
| ATS | Blue (#3b82f6) | Highways, trucks, logistics |
| Farming Sim | Green (#22c55e) | Fields, tractors, harvests |
| Construction Sim | Amber (#f59e0b) | Excavators, building sites |
| Mechanic Sim | Red (#ef4444) | Garages, tools, engines |

