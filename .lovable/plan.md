
# Channel-Based Work Orders with XP Rewards

## Overview

This plan enhances the Work Orders feature to be channel-subscription aware, allowing users to see work orders from game channels they've subscribed to. Channel admins will be able to create and manage work orders with customizable point awards.

---

## Current State Analysis

| Component | Status | Gap |
|-----------|--------|-----|
| `work_orders` table | Has game_title, tenant_id | No XP/points field, no channel link |
| `game_channels` table | Exists with 4 game channels | Not linked to work orders |
| `channel_subscriptions` table | Exists but empty | Users can subscribe to game channels |
| `user_points` table | Full XP ledger system | Missing "work_order" as source_type |
| Work Orders page | Shows all work orders | No subscription filtering |

---

## Database Changes

### 1. Extend `work_orders` Table

Add new columns to support point rewards and channel association:

| Column | Type | Description |
|--------|------|-------------|
| `xp_reward` | integer | Base XP awarded on completion (default: 50) |
| `channel_id` | uuid | Optional link to game_channels table |
| `difficulty` | text | beginner, intermediate, advanced |
| `estimated_time_minutes` | integer | Expected completion time |
| `max_attempts` | integer | Max tries allowed (null = unlimited) |

### 2. Add "work_order" to source_type Enum

Update the `source_type` enum to include work orders as a valid point source:

```sql
ALTER TYPE source_type ADD VALUE 'work_order';
```

### 3. Create `user_work_order_completions` Table

Track individual work order attempts and completions:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to profiles |
| `work_order_id` | uuid | FK to work_orders |
| `status` | text | in_progress, completed, failed |
| `score` | numeric | Achievement score |
| `xp_awarded` | integer | Points given |
| `attempt_number` | integer | Which attempt this is |
| `started_at` | timestamp | When started |
| `completed_at` | timestamp | When finished |
| `metadata` | jsonb | Additional telemetry data |

---

## Architecture

```text
+-------------------+     +-------------------+     +-------------------+
|   game_channels   |     |   work_orders     |     |  user_work_order  |
|   (ATS, etc.)     |<----|   (channel_id)    |---->|   _completions    |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|    channel_       |     |   xp_reward,      |     |   status, score,  |
|  subscriptions    |     |   difficulty      |     |   xp_awarded      |
|  (user → game)    |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```

---

## Feature Implementation

### 1. Subscription-Based Work Order Filtering

Update the Work Orders page to show:
- **My Channels**: Work orders from subscribed game channels (prioritized)
- **All Channels**: Browse work orders from all channels
- **Trending**: Popular work orders across all channels

**Filter Tabs:**
| Tab | Description |
|-----|-------------|
| For You | Work orders from subscribed channels |
| All | All active work orders |
| Trucking | ATS game channel only |
| Farming | Farming_Sim channel only |
| Construction | Construction_Sim channel only |
| Mechanic | Mechanic_Sim channel only |

### 2. Work Order Card Enhancements

Add to `EventCard.tsx`:
- XP reward badge showing potential points
- Difficulty indicator (beginner/intermediate/advanced stars)
- Estimated completion time
- User's completion status (if attempted)
- Progress indicator for in-progress work orders

### 3. Channel Subscription Flow

Add subscription buttons to:
- Game channel pages
- Work Orders page filter section
- First-time user onboarding

**Quick Subscribe Component:**
Shows game channel cards with subscribe/unsubscribe toggle

### 4. Work Order Detail Page

Create `/work-orders/:id` with:
- Full work order description
- Success criteria breakdown
- XP reward + difficulty + time
- "Start Work Order" button
- Previous attempts history
- Leaderboard for this work order
- Related work orders from same channel

### 5. Admin Work Order Management

Add to Admin Dashboard or Channel Admin view:
- **Work Order List**: Table of all work orders for their channel
- **Create Work Order** dialog:
  - Title, description
  - Game channel selection
  - XP reward (slider: 25-500)
  - Difficulty level
  - Success criteria builder
  - Estimated time
  - Max attempts
- **Edit/Delete** existing work orders
- **Analytics**: Completion rates, average scores

---

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `WorkOrderDetailPage.tsx` | `/work-orders/:id` | Full work order view |
| `WorkOrderFilters.tsx` | Work Orders page | Tab + subscription filters |
| `ChannelSubscribeButton.tsx` | Various | Subscribe/unsubscribe toggle |
| `WorkOrderCreateDialog.tsx` | Admin | Create new work order form |
| `WorkOrderProgressBadge.tsx` | EventCard | Shows completion status |
| `XPRewardBadge.tsx` | EventCard | Shows potential XP |
| `DifficultyIndicator.tsx` | EventCard | Star rating for difficulty |

---

## Hooks

### `useChannelSubscriptions`
```typescript
- subscriptions: GameTitle[] // User's subscribed channels
- isSubscribed(gameTitle): boolean
- subscribe(gameTitle): Promise
- unsubscribe(gameTitle): Promise
```

### `useSubscribedWorkOrders`
```typescript
- workOrders: WorkOrder[] // Filtered by user subscriptions
- isLoading: boolean
- refetch(): void
```

### `useWorkOrderCompletion`
```typescript
- startWorkOrder(id): Promise<completionRecord>
- completeWorkOrder(id, score): Promise<xpAwarded>
- getUserProgress(workOrderId): CompletionRecord | null
```

---

## XP Award Logic

When a work order is completed:

```text
base_xp = work_order.xp_reward

// Score multiplier (like existing LMS)
score_multiplier = score >= 90 ? 1.5 : score >= 80 ? 1.2 : 1.0

// First completion bonus
first_completion_bonus = is_first_attempt ? 1.25 : 1.0

// Difficulty bonus
difficulty_bonus = {
  beginner: 1.0,
  intermediate: 1.2,
  advanced: 1.5
}[difficulty]

final_xp = base_xp * score_multiplier * first_completion_bonus * difficulty_bonus
```

**XP is recorded in `user_points` table with:**
- `source_type`: 'work_order'
- `source_id`: work_order.id
- `description`: "Completed {work_order.title}"

---

## RLS Policies

### `work_orders`
| Action | Policy |
|--------|--------|
| SELECT | Public (all active work orders) |
| INSERT | Admins + Channel admins |
| UPDATE | Admins + Channel admins (own channel) |
| DELETE | Admins only |

### `user_work_order_completions`
| Action | Policy |
|--------|--------|
| SELECT | Own records |
| INSERT | Own records |
| UPDATE | Own records |
| DELETE | None |

---

## UI Changes

### Work Orders Page Updates

1. **Add Filter Tabs** below hero:
   - For You / All / By Game Channel

2. **Subscription Banner** (if no subscriptions):
   - "Subscribe to channels to see personalized work orders"
   - Quick-subscribe buttons for each game

3. **Work Order Cards Enhanced**:
   - XP badge in corner
   - Difficulty stars
   - Completion checkmark if done
   - Progress bar if in-progress

4. **New Work Order Button** (admin only):
   - Opens `WorkOrderCreateDialog`

### Admin Dashboard Updates

1. **Work Orders Tab**:
   - List of work orders (sortable, filterable)
   - Quick stats: total, completions, avg score
   - Create/Edit/Delete actions

---

## Implementation Order

### Phase 1: Database (Foundation)
1. Add columns to `work_orders` (xp_reward, channel_id, difficulty)
2. Update source_type enum
3. Create `user_work_order_completions` table
4. Set up RLS policies
5. Seed existing work orders with default XP values

### Phase 2: Hooks & Data Layer
1. Create `useChannelSubscriptions` hook
2. Create `useSubscribedWorkOrders` hook
3. Create `useWorkOrderCompletion` hook
4. Integrate XP awarding with existing `useAwardPoints`

### Phase 3: UI Components
1. Create filter tabs component
2. Create XP/difficulty badges
3. Update `EventCard` with new badges
4. Create channel subscribe button

### Phase 4: Work Order Detail Page
1. Create `/work-orders/:id` route and page
2. Show full details, criteria, rewards
3. Add "Start Work Order" flow
4. Add completion history

### Phase 5: Admin Management
1. Add Work Orders tab to Admin
2. Create work order creation dialog
3. Add edit/delete functionality
4. Add basic analytics

---

## File Changes Summary

### New Files
```text
src/pages/WorkOrderDetail.tsx
src/components/work-orders/WorkOrderFilters.tsx
src/components/work-orders/ChannelSubscribeButton.tsx
src/components/work-orders/WorkOrderCreateDialog.tsx
src/components/work-orders/XPRewardBadge.tsx
src/components/work-orders/DifficultyIndicator.tsx
src/hooks/useChannelSubscriptions.ts
src/hooks/useWorkOrders.ts
src/hooks/useWorkOrderCompletion.ts
```

### Modified Files
```text
src/pages/WorkOrders.tsx (add filters, subscription logic)
src/pages/Admin.tsx (add Work Orders management tab)
src/components/marketplace/EventCard.tsx (add XP badge, status)
src/types/tenant.ts (update WorkOrder interface)
src/App.tsx (add work order detail route)
```

---

## Summary

This enhancement transforms Work Orders into a channel-centric feature where:

1. **Users** see work orders from their subscribed game channels first
2. **Channel admins** can create work orders with custom XP rewards
3. **Completion tracking** records attempts and awards XP automatically
4. **Gamification** encourages engagement with difficulty bonuses and score multipliers
5. **Integration** with existing LMS XP system maintains unified progression
