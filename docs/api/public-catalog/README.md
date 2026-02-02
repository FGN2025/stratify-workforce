# Public Catalog API

The Public Catalog API provides read-only access to FGN.Academy's training content, enabling external applications to display courses, work orders, and skills.

## Base URL

```
https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog
```

## Endpoints Summary

All endpoints are public (no authentication required).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/games` | List available simulation games |
| GET | `/courses` | List published courses |
| GET | `/courses/:id` | Get course with modules and lessons |
| GET | `/work-orders` | List active work orders |
| GET | `/work-orders/:id` | Get work order details |
| GET | `/skills` | Get skills taxonomy for a game |

## Features

### Caching

All responses include cache headers for optimal performance:

```
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

This means:
- Responses are cached for 5 minutes
- Stale responses can be served while revalidating
- CDNs and browsers can cache responses

### Pagination

List endpoints support pagination:

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of items per page |
| `offset` | 0 | - | Number of items to skip |

Example:
```
GET /courses?limit=10&offset=20
```

### Filtering

List endpoints support filtering by game and difficulty:

| Parameter | Endpoints | Values |
|-----------|-----------|--------|
| `game` | work-orders, skills | ATS, Farming_Sim, Construction_Sim, Mechanic_Sim |
| `difficulty` | courses, work-orders | beginner, intermediate, advanced, expert |

## Supported Games

| Key | Name | Short Name |
|-----|------|------------|
| `ATS` | American Truck Simulator | ATS |
| `Farming_Sim` | Farming Simulator | Farming |
| `Construction_Sim` | Construction Simulator | Construction |
| `Mechanic_Sim` | Mechanic Simulator | Mechanic |

## Detailed Endpoint Documentation

- [Games](./games.md)
- [Courses](./courses.md)
- [Work Orders](./work-orders.md)
- [Skills](./skills.md)

## Use Cases

### CDL Quest Integration

CDL Quest displays available work orders to help users practice:

```typescript
// Fetch ATS work orders for display
const workOrders = await fetch(
  'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders?game=ATS'
).then(r => r.json());

// Display in UI
workOrders.work_orders.forEach(wo => {
  console.log(`${wo.title} - ${wo.difficulty} - ${wo.xp_reward} XP`);
});
```

### FGN.Business Course Catalog

FGN.Business shows available training courses to employers:

```typescript
// Fetch all published courses
const { courses, total } = await fetch(
  'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/courses'
).then(r => r.json());

// Show course count
console.log(`${total} courses available`);
```

### Skills Taxonomy for Reporting

External systems use the skills taxonomy for consistent skill naming:

```typescript
// Get standardized skill names for ATS
const { skills } = await fetch(
  'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/skills?game=ATS'
).then(r => r.json());

// Map skill keys to display names
const skillMap = Object.fromEntries(
  skills.map(s => [s.key, s.name])
);

console.log(skillMap['pre_trip_inspection']); // "Pre-Trip Inspection"
```
