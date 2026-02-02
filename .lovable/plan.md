
# Plan: Public Catalog API Edge Function

## Overview

Build a `public-catalog` edge function that exposes FGN.Academy's training content (courses, work orders, and skills taxonomy) to external consumer sites like CDL Quest and CDL Exchange. This API will serve as the master catalog for the ecosystem, allowing external apps to fetch and display training content without needing direct database access.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC CATALOG API                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   FGN.ACADEMY                                                                   │
│   ─────────────────────────────────────────────────────────────────────────     │
│                                                                                  │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐              │
│   │    COURSES      │   │   WORK ORDERS   │   │  CREDENTIAL     │              │
│   │    (Published)  │   │   (Active)      │   │    TYPES        │              │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘              │
│            │                     │                      │                       │
│            └─────────────────────┼──────────────────────┘                       │
│                                  │                                              │
│                                  ▼                                              │
│                    ┌─────────────────────────────┐                             │
│                    │     public-catalog API       │                             │
│                    │     (Edge Function)          │                             │
│                    │                              │                             │
│                    │  GET /courses                │                             │
│                    │  GET /courses/:id            │                             │
│                    │  GET /work-orders            │                             │
│                    │  GET /work-orders/:id        │                             │
│                    │  GET /skills                 │                             │
│                    │  GET /games                  │                             │
│                    └───────────────┬──────────────┘                             │
│                                    │                                             │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   CDL QUEST     │    │  CDL EXCHANGE   │    │  FGN.BUSINESS   │
    │                 │    │                 │    │                 │
    │  Fetches:       │    │  Fetches:       │    │  Fetches:       │
    │  - Courses      │    │  - Credential   │    │  - All games    │
    │  - Work Orders  │    │    types        │    │  - Skills data  │
    │  - ATS Skills   │    │  - Skills       │    │  - Aggregate    │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## API Endpoints

### Public Endpoints (No Authentication Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/courses` | GET | List all published courses |
| `/courses/:id` | GET | Get single course with modules and lessons |
| `/work-orders` | GET | List all active work orders |
| `/work-orders/:id` | GET | Get single work order details |
| `/skills` | GET | Get skills taxonomy for a game |
| `/games` | GET | List available simulation games |

### Query Parameters

| Parameter | Endpoints | Description |
|-----------|-----------|-------------|
| `game` | `/courses`, `/work-orders`, `/skills` | Filter by game title (ATS, Farming_Sim, etc.) |
| `difficulty` | `/courses`, `/work-orders` | Filter by difficulty level |
| `featured` | `/courses` | Show only featured courses |
| `limit` | All list endpoints | Limit number of results (default: 50, max: 100) |
| `offset` | All list endpoints | Pagination offset |

---

## Response Formats

### GET /courses

```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "CDL Fundamentals",
      "description": "Learn the basics of commercial driving",
      "cover_image_url": "https://...",
      "difficulty_level": "beginner",
      "estimated_hours": 10,
      "xp_reward": 500,
      "module_count": 5,
      "lesson_count": 20,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### GET /courses/:id

```json
{
  "course": {
    "id": "uuid",
    "title": "CDL Fundamentals",
    "description": "Full description...",
    "cover_image_url": "https://...",
    "difficulty_level": "beginner",
    "estimated_hours": 10,
    "xp_reward": 500,
    "modules": [
      {
        "id": "uuid",
        "title": "Module 1: Pre-Trip Inspection",
        "description": "Learn to perform vehicle inspections",
        "order_index": 1,
        "xp_reward": 100,
        "lessons": [
          {
            "id": "uuid",
            "title": "Introduction to Pre-Trip",
            "lesson_type": "video",
            "duration_minutes": 15,
            "xp_reward": 25,
            "order_index": 1
          }
        ]
      }
    ]
  }
}
```

### GET /work-orders

```json
{
  "work_orders": [
    {
      "id": "uuid",
      "title": "Highway Delivery Challenge",
      "description": "Complete a 500-mile delivery",
      "game_title": "ATS",
      "difficulty": "intermediate",
      "xp_reward": 150,
      "estimated_time_minutes": 30,
      "success_criteria": {
        "distance": 500,
        "damage_max": 2
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

### GET /skills

```json
{
  "game": "ATS",
  "skills": [
    {
      "key": "pre_trip_inspection",
      "name": "Pre-Trip Inspection",
      "category": "safety",
      "description": "Ability to perform thorough vehicle inspections"
    },
    {
      "key": "backing_maneuvers",
      "name": "Backing Maneuvers",
      "category": "precision",
      "description": "Skill in reverse driving and docking"
    }
  ]
}
```

### GET /games

```json
{
  "games": [
    {
      "key": "ATS",
      "name": "American Truck Simulator",
      "short_name": "ATS",
      "accent_color": "#3B82F6",
      "skills_count": 12,
      "work_orders_count": 45,
      "courses_count": 8
    }
  ]
}
```

---

## Database Changes

### New Table: `skills_taxonomy`

Create a table to store the skills vocabulary for each game:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| game_title | game_title enum | Which simulation game |
| skill_key | text | Unique identifier (snake_case) |
| skill_name | text | Display name |
| category | text | Grouping (safety, precision, efficiency, etc.) |
| description | text | What this skill represents |
| sort_order | integer | Display ordering |
| is_active | boolean | Whether skill is in use |
| created_at | timestamp | Creation time |

### Seed Data for ATS Skills

```text
Pre-defined CDL skills for American Truck Simulator:

Safety Category:
- pre_trip_inspection: Pre-Trip Inspection
- defensive_driving: Defensive Driving
- hazmat_handling: Hazmat Handling

Precision Category:
- backing_maneuvers: Backing Maneuvers
- parallel_parking: Parallel Parking
- docking: Loading Dock Procedures

Efficiency Category:
- route_planning: Route Planning
- fuel_management: Fuel Efficiency
- time_management: Schedule Adherence

Equipment Category:
- coupling_uncoupling: Coupling/Uncoupling
- brake_systems: Air Brake Systems
- cargo_securement: Cargo Securement
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/public-catalog/index.ts` | Main edge function with all endpoints |
| `src/hooks/useLearningPaths.ts` | Hook for admin management (future) |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add function configuration with `verify_jwt = false` |

---

## Implementation Details

### Edge Function Structure

```text
supabase/functions/public-catalog/index.ts
├── CORS headers (allow all origins for public API)
├── Request routing based on path
├── Query parameter parsing
├── Supabase client (service role for read access)
├── Endpoint handlers:
│   ├── handleListCourses()
│   ├── handleGetCourse()
│   ├── handleListWorkOrders()
│   ├── handleGetWorkOrder()
│   ├── handleListSkills()
│   └── handleListGames()
└── Error handling with proper HTTP status codes
```

### Security Considerations

- All endpoints are public (no authentication required)
- Read-only access (no mutations)
- Only returns published/active content
- No sensitive data exposed (no user IDs, no internal metadata)
- Rate limiting via Supabase Edge Functions (built-in)

### Caching Headers

Response includes caching headers for performance:

```text
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

This allows CDL Quest/Exchange to cache responses for 5 minutes while revalidating in the background.

---

## Integration with Existing credential-api

The `public-catalog` API complements the existing `credential-api`:

| API | Purpose | Auth Required |
|-----|---------|---------------|
| **credential-api** | Issue/verify credentials, manage passports | Yes (API key or JWT) |
| **public-catalog** | Browse training content, skills taxonomy | No |

Consumer sites use both:
1. `public-catalog` to display available training
2. `credential-api` to issue credentials when training is completed

---

## Testing Plan

After implementation, test endpoints using the edge function curl tool:

1. `GET /games` - List all simulation games
2. `GET /courses?game=ATS` - List ATS courses
3. `GET /courses/:id` - Get course details with modules
4. `GET /work-orders?game=ATS&difficulty=beginner` - Filter work orders
5. `GET /skills?game=ATS` - Get CDL skills taxonomy

---

## Summary

This implementation creates a public read-only API that serves as the master catalog for the FGN ecosystem. External sites can:

- Display the training catalog without needing database access
- Filter content by game (ATS for CDL Quest)
- Access the skills taxonomy for consistent skill naming
- Integrate with the credential-api for issuing credentials

The API follows the same patterns as the existing `credential-api` for consistency and maintainability.
