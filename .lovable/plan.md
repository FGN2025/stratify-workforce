
# Event Scheduling and Player Management Module

## Overview

Build a scheduling system for gaming events where users can view a graphical calendar, register for events, and participate in scheduled competitions. Events are tied to existing Work Orders for scoring/criteria reuse. The MVP includes quest-type events and single-elimination head-to-head brackets.

---

## Architecture Summary

```text
+------------------+     +-------------------+     +-------------------+
|   work_orders    |<----|     events        |<----|event_registrations|
| (scoring/XP)     |     | (scheduling)      |     | (user sign-ups)   |
+------------------+     +-------------------+     +-------------------+
                                 |
                                 v
                         +-------------------+
                         |  event_matches    |
                         | (H2H brackets)    |
                         +-------------------+
```

---

## Database Changes

### New Table: `events`

Core scheduling data linked to work orders.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| work_order_id | uuid | FK to work_orders (inherits scoring, XP, game) |
| title | text | Event display name |
| description | text | Event details |
| event_type | enum | 'quest' or 'head_to_head' |
| scheduled_start | timestamptz | When event begins |
| scheduled_end | timestamptz | When event ends |
| registration_deadline | timestamptz | Cutoff for sign-ups |
| min_participants | integer | Minimum to run event |
| max_participants | integer | Capacity limit |
| status | enum | 'draft', 'published', 'registration_open', 'in_progress', 'completed', 'cancelled' |
| tenant_id | uuid | Host organization (nullable) |
| created_by | uuid | Admin who created |
| created_at | timestamptz | Creation time |
| google_calendar_event_id | text | For calendar sync (nullable) |

### New Table: `event_registrations`

User sign-ups for events.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | FK to events |
| user_id | uuid | Registered user |
| registered_at | timestamptz | Sign-up time |
| status | enum | 'registered', 'confirmed', 'cancelled', 'no_show' |
| bracket_seed | integer | For H2H seeding (nullable) |

### New Table: `event_matches` (Head-to-Head Only)

Single elimination bracket matches.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | FK to events |
| round_number | integer | Bracket round (1 = finals) |
| match_order | integer | Position within round |
| player1_id | uuid | First competitor |
| player2_id | uuid | Second competitor (null = bye) |
| winner_id | uuid | Match winner (nullable until complete) |
| player1_score | integer | P1 result |
| player2_score | integer | P2 result |
| scheduled_time | timestamptz | Match start time |
| status | enum | 'pending', 'in_progress', 'completed' |

### New Enums

- `event_type`: 'quest', 'head_to_head'
- `event_status`: 'draft', 'published', 'registration_open', 'in_progress', 'completed', 'cancelled'
- `registration_status`: 'registered', 'confirmed', 'cancelled', 'no_show'
- `match_status`: 'pending', 'in_progress', 'completed'

### RLS Policies

| Table | Policy |
|-------|--------|
| events | Public read for published events; admin insert/update/delete |
| event_registrations | Users can register themselves; admins can manage all |
| event_matches | Users can view matches they're in; admins can update |

---

## Component Architecture

### New Pages

1. **`Events.tsx`** (`/events`)
   - Main calendar view with monthly/weekly toggle
   - Filter by game title
   - List of upcoming events

2. **`EventDetail.tsx`** (`/events/:id`)
   - Event info and countdown
   - Registration button with capacity check
   - Participant list
   - Bracket display for H2H events

### New Components

1. **`EventCalendar.tsx`**
   - Enhanced calendar using react-day-picker
   - Event dots on dates with events
   - Click date to see day's events
   - Color-coded by game type

2. **`EventCard.tsx`**
   - Display card for event listings
   - Shows game, time, participants, XP
   - Registration status indicator

3. **`EventBracket.tsx`**
   - Single elimination bracket visualization
   - Show match pairings and results
   - Highlight user's position

4. **`EventRegistrationButton.tsx`**
   - Register/unregister with capacity check
   - Shows spots remaining
   - Deadline indicator

5. **`EventsManager.tsx`** (Admin)
   - CRUD for events
   - Link to work orders
   - Set schedule and capacity

6. **`AddToGoogleCalendar.tsx`**
   - Generate Google Calendar link
   - Uses standard gcal URL scheme

### New Hooks

1. **`useEvents.ts`**
   - Fetch events with filters (date range, game, status)
   - Similar pattern to useWorkOrders

2. **`useEventById.ts`**
   - Single event with registrations

3. **`useEventRegistration.ts`**
   - Check registration status
   - Register/unregister mutations
   - Pattern similar to useEnrollment

4. **`useEventMatches.ts`**
   - Fetch bracket matches for H2H events
   - Update match results (admin)

5. **`useBracketGeneration.ts`**
   - Generate single elimination bracket
   - Seed participants randomly or by ranking

---

## User Flow

```text
1. User visits /events
   -> Sees calendar with event indicators
   -> Can filter by game

2. User clicks on an event
   -> Navigates to /events/:id
   -> Sees event details, XP reward, participants

3. User clicks "Register"
   -> Added to event_registrations
   -> Sees confirmation + countdown

4. Event starts (quest type)
   -> User plays linked work order
   -> Scores recorded via existing work order system
   -> Leaderboard shows top performers

5. Event starts (H2H type)
   -> Bracket generated from registrations
   -> Matches scheduled in rounds
   -> Winners advance until finals

6. Event ends
   -> XP distributed to participants
   -> Results shown on event page
```

---

## Admin Flow

```text
1. Admin goes to Admin -> Events tab
2. Creates new event:
   - Selects existing work order (inherits game, XP, criteria)
   - Sets schedule (start, end, registration deadline)
   - Sets capacity (min/max participants)
   - Chooses type (quest or H2H)
3. Publishes event (opens registration)
4. Monitors registrations
5. For H2H: Generates bracket when ready
6. Manages match results
7. Event auto-completes when time ends
```

---

## Google Calendar Integration

Use standard URL scheme (no API key required for adding events):

```typescript
const generateGoogleCalendarUrl = (event: Event) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGcalDate(event.scheduled_start)}/${formatGcalDate(event.scheduled_end)}`,
    details: event.description,
    location: 'FGN Academy Online',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_create_events_tables.sql` | Database schema |
| `src/pages/Events.tsx` | Calendar page |
| `src/pages/EventDetail.tsx` | Event details page |
| `src/components/events/EventCalendar.tsx` | Calendar component |
| `src/components/events/EventCard.tsx` | Event list card |
| `src/components/events/EventBracket.tsx` | H2H bracket display |
| `src/components/events/EventRegistrationButton.tsx` | Register/unregister |
| `src/components/events/AddToGoogleCalendar.tsx` | Calendar export |
| `src/components/admin/EventsManager.tsx` | Admin CRUD |
| `src/components/admin/EventEditDialog.tsx` | Create/edit dialog |
| `src/hooks/useEvents.ts` | Events data hook |
| `src/hooks/useEventRegistration.ts` | Registration hook |
| `src/hooks/useEventMatches.ts` | H2H matches hook |
| `src/hooks/useBracketGeneration.ts` | Bracket logic |
| `src/types/events.ts` | TypeScript types |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add /events and /events/:id routes |
| `src/pages/Admin.tsx` | Add Events tab |
| `src/components/layout/AppSidebar.tsx` | Add Events nav link |

---

## Implementation Phases

### Phase 1: Database and Core Infrastructure (3-4 hours)
1. Create database migration with all tables, enums, RLS
2. Create TypeScript types
3. Create useEvents and useEventById hooks
4. Create useEventRegistration hook

### Phase 2: Calendar UI (3-4 hours)
1. Build EventCalendar component with date navigation
2. Build EventCard component
3. Create Events page with calendar and list views
4. Add game filtering

### Phase 3: Event Details and Registration (2-3 hours)
1. Create EventDetail page
2. Build EventRegistrationButton with capacity logic
3. Add participant list display
4. Implement Google Calendar link

### Phase 4: Admin Management (2-3 hours)
1. Create EventsManager component (following WorkOrdersManager pattern)
2. Create EventEditDialog with work order selection
3. Add Events tab to Admin page

### Phase 5: Head-to-Head Brackets (3-4 hours)
1. Implement bracket generation logic
2. Create EventBracket visualization component
3. Add match result recording
4. Build winner advancement flow

### Phase 6: Polish and Navigation (1-2 hours)
1. Add Events to sidebar navigation
2. Add routes to App.tsx
3. Add realtime updates for registrations
4. Testing and refinement

---

## Estimated Total: 2-3 Weeks

- **Week 1**: Phases 1-3 (Database, Calendar, Registration)
- **Week 2**: Phases 4-5 (Admin, H2H Brackets)
- **Week 3**: Phase 6 + Testing + Refinements

---

## Technical Notes

### Leveraging Existing Patterns

- **WorkOrdersManager.tsx**: Template for EventsManager CRUD UI
- **useEnrollment.ts**: Pattern for registration mutations
- **EventCard.tsx** (existing): Can extend for scheduled events
- **useWorkOrders.ts**: Pattern for events fetching hook
- **WorkOrderDetail.tsx**: Template for EventDetail page

### Key Decisions

1. Events reference Work Orders rather than duplicating fields
2. Google Calendar uses URL scheme (no API integration needed)
3. Single elimination only for MVP (Swiss/double-elim later)
4. No team events in MVP
5. No recurring events in MVP

