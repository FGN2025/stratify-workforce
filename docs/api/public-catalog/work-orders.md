# Public Catalog API - Work Orders

## GET /work-orders

List all active work orders (simulation challenges).

### Request

```
GET /work-orders?game={game}&difficulty={level}&limit={limit}&offset={offset}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `game` | string | - | Filter by game: ATS, Farming_Sim, Construction_Sim, Mechanic_Sim |
| `difficulty` | string | - | Filter by level: beginner, intermediate, advanced, expert |
| `limit` | number | 50 | Results per page (max: 100) |
| `offset` | number | 0 | Number of results to skip |

### Response

```json
{
  "work_orders": [
    {
      "id": "uuid",
      "title": "Highway Delivery Challenge",
      "description": "Complete a 500-mile delivery across multiple states",
      "game_title": "ATS",
      "difficulty": "intermediate",
      "xp_reward": 150,
      "estimated_time_minutes": 30,
      "success_criteria": {
        "distance": 500,
        "damage_max": 2,
        "time_limit_minutes": 45
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique work order identifier |
| `title` | string | Work order title |
| `description` | string | Detailed description |
| `game_title` | string | Which simulation game |
| `difficulty` | string | beginner, intermediate, advanced, expert |
| `xp_reward` | number | XP earned on completion |
| `estimated_time_minutes` | number | Estimated completion time |
| `success_criteria` | object | Requirements for successful completion |
| `created_at` | string | ISO 8601 timestamp |

### Example

```bash
# Get all work orders
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders

# Get ATS work orders only
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders?game=ATS"

# Get beginner ATS work orders
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders?game=ATS&difficulty=beginner"
```

---

## GET /work-orders/:id

Get detailed work order information.

### Request

```
GET /work-orders/{work_order_id}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `work_order_id` | string | Yes | UUID of the work order |

### Response

```json
{
  "work_order": {
    "id": "uuid",
    "title": "Highway Delivery Challenge",
    "description": "Complete a 500-mile delivery across multiple states while maintaining fuel efficiency and avoiding damage.",
    "game_title": "ATS",
    "difficulty": "intermediate",
    "xp_reward": 150,
    "estimated_time_minutes": 30,
    "max_attempts": 3,
    "success_criteria": {
      "distance": 500,
      "damage_max": 2,
      "time_limit_minutes": 45,
      "fuel_efficiency_min": 6.5
    },
    "evidence_requirements": {
      "screenshot_required": true,
      "telemetry_required": true
    },
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `max_attempts` | number | Maximum attempts allowed (null = unlimited) |
| `evidence_requirements` | object | What proof is needed for completion |

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Work order not found` | Work order doesn't exist or isn't active |

### Example

```bash
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders/123e4567-e89b-12d3-a456-426614174000
```

### TypeScript

```typescript
interface SuccessCriteria {
  distance?: number;
  damage_max?: number;
  time_limit_minutes?: number;
  fuel_efficiency_min?: number;
  cargo_weight_min?: number;
  [key: string]: unknown;
}

interface EvidenceRequirements {
  screenshot_required?: boolean;
  telemetry_required?: boolean;
  video_required?: boolean;
  [key: string]: unknown;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  game_title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  xp_reward: number;
  estimated_time_minutes: number | null;
  max_attempts?: number | null;
  success_criteria: SuccessCriteria | null;
  evidence_requirements?: EvidenceRequirements | null;
  created_at: string;
}

interface WorkOrdersListResponse {
  work_orders: WorkOrder[];
  total: number;
  limit: number;
  offset: number;
}

interface WorkOrderDetailResponse {
  work_order: WorkOrder;
}

// List work orders
async function listWorkOrders(params?: {
  game?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}): Promise<WorkOrdersListResponse> {
  const url = new URL('https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders');
  
  if (params?.game) url.searchParams.set('game', params.game);
  if (params?.difficulty) url.searchParams.set('difficulty', params.difficulty);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());
  
  const response = await fetch(url.toString());
  return response.json();
}

// Get work order details
async function getWorkOrder(workOrderId: string): Promise<WorkOrderDetailResponse> {
  const response = await fetch(
    `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders/${workOrderId}`
  );
  
  if (!response.ok) {
    throw new Error('Work order not found');
  }
  
  return response.json();
}

// Usage
const { work_orders } = await listWorkOrders({ game: 'ATS', difficulty: 'beginner' });

for (const wo of work_orders) {
  console.log(`${wo.title} (${wo.difficulty}) - ${wo.xp_reward} XP`);
  if (wo.success_criteria?.distance) {
    console.log(`  Distance: ${wo.success_criteria.distance} miles`);
  }
}
```

### Success Criteria Examples

Different work orders may have different success criteria:

**Delivery Challenge:**
```json
{
  "distance": 500,
  "damage_max": 2,
  "time_limit_minutes": 45
}
```

**Fuel Efficiency Run:**
```json
{
  "distance": 200,
  "fuel_efficiency_min": 7.0
}
```

**Heavy Haul:**
```json
{
  "cargo_weight_min": 50000,
  "damage_max": 0,
  "speed_limit_max": 55
}
```

### Notes

- Only global work orders (no tenant) are returned
- `is_active` must be true to be included
- `success_criteria` and `evidence_requirements` are flexible JSON objects
