# Public Catalog API - Games

## GET /games

List all available simulation games with content counts.

### Request

```
GET /games
```

### Response

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
    },
    {
      "key": "Farming_Sim",
      "name": "Farming Simulator",
      "short_name": "Farming",
      "accent_color": "#22C55E",
      "skills_count": 0,
      "work_orders_count": 0,
      "courses_count": 0
    },
    {
      "key": "Construction_Sim",
      "name": "Construction Simulator",
      "short_name": "Construction",
      "accent_color": "#F59E0B",
      "skills_count": 0,
      "work_orders_count": 0,
      "courses_count": 0
    },
    {
      "key": "Mechanic_Sim",
      "name": "Mechanic Simulator",
      "short_name": "Mechanic",
      "accent_color": "#EF4444",
      "skills_count": 0,
      "work_orders_count": 0,
      "courses_count": 0
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Game identifier used in other API calls |
| `name` | string | Full display name |
| `short_name` | string | Abbreviated name |
| `accent_color` | string | Hex color for UI theming |
| `skills_count` | number | Number of skills in taxonomy |
| `work_orders_count` | number | Number of active work orders |
| `courses_count` | number | Number of published courses |

### Example

```bash
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/games
```

### TypeScript

```typescript
interface Game {
  key: string;
  name: string;
  short_name: string;
  accent_color: string;
  skills_count: number;
  work_orders_count: number;
  courses_count: number;
}

interface GamesResponse {
  games: Game[];
}

async function getGames(): Promise<GamesResponse> {
  const response = await fetch(
    'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/games'
  );
  return response.json();
}

// Usage
const { games } = await getGames();

// Find games with content
const activeGames = games.filter(g => g.work_orders_count > 0);
console.log('Games with work orders:', activeGames.map(g => g.name).join(', '));

// Get game accent color for theming
const atsGame = games.find(g => g.key === 'ATS');
document.documentElement.style.setProperty('--game-color', atsGame?.accent_color || '#3B82F6');
```

### Notes

- All four simulation games are always returned
- Counts reflect only active/published content
- Games with zero content are still included (for UI completeness)
- `courses_count` is currently global (not game-specific)
