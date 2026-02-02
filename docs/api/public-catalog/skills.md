# Public Catalog API - Skills

## GET /skills

Get the skills taxonomy for a specific simulation game.

### Request

```
GET /skills?game={game}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `game` | string | Yes | Game identifier: ATS, Farming_Sim, Construction_Sim, Mechanic_Sim |

### Response

```json
{
  "game": "ATS",
  "skills": [
    {
      "key": "pre_trip_inspection",
      "name": "Pre-Trip Inspection",
      "category": "safety",
      "description": "Ability to perform thorough vehicle safety inspections before operation"
    },
    {
      "key": "defensive_driving",
      "name": "Defensive Driving",
      "category": "safety",
      "description": "Techniques for anticipating hazards and driving safely"
    },
    {
      "key": "hazmat_handling",
      "name": "Hazmat Handling",
      "category": "safety",
      "description": "Safe handling procedures for hazardous materials"
    },
    {
      "key": "backing_maneuvers",
      "name": "Backing Maneuvers",
      "category": "precision",
      "description": "Skill in reverse driving and positioning"
    },
    {
      "key": "parallel_parking",
      "name": "Parallel Parking",
      "category": "precision",
      "description": "Precision parking in tight spaces"
    },
    {
      "key": "docking",
      "name": "Loading Dock Procedures",
      "category": "precision",
      "description": "Backing into loading docks safely and efficiently"
    },
    {
      "key": "route_planning",
      "name": "Route Planning",
      "category": "efficiency",
      "description": "Planning optimal routes considering distance, time, and restrictions"
    },
    {
      "key": "fuel_management",
      "name": "Fuel Efficiency",
      "category": "efficiency",
      "description": "Techniques for maximizing fuel economy"
    },
    {
      "key": "time_management",
      "name": "Schedule Adherence",
      "category": "efficiency",
      "description": "Meeting delivery deadlines while complying with regulations"
    },
    {
      "key": "coupling_uncoupling",
      "name": "Coupling/Uncoupling",
      "category": "equipment",
      "description": "Properly connecting and disconnecting trailers"
    },
    {
      "key": "brake_systems",
      "name": "Air Brake Systems",
      "category": "equipment",
      "description": "Understanding and operating commercial air brake systems"
    },
    {
      "key": "cargo_securement",
      "name": "Cargo Securement",
      "category": "equipment",
      "description": "Properly securing cargo to prevent shifting or damage"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique skill identifier (snake_case) |
| `name` | string | Human-readable skill name |
| `category` | string | Skill category for grouping |
| `description` | string | Detailed skill description |

### Skill Categories (ATS)

| Category | Description | Skills |
|----------|-------------|--------|
| `safety` | Safety-related skills | pre_trip_inspection, defensive_driving, hazmat_handling |
| `precision` | Precision driving skills | backing_maneuvers, parallel_parking, docking |
| `efficiency` | Operational efficiency | route_planning, fuel_management, time_management |
| `equipment` | Equipment operation | coupling_uncoupling, brake_systems, cargo_securement |

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `game parameter required (ATS, Farming_Sim, etc.)` | Missing or invalid game |

### Example

```bash
# Get ATS skills
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/skills?game=ATS"

# Error - missing game
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/skills
# Returns: {"error": "game parameter required (ATS, Farming_Sim, etc.)"}
```

### TypeScript

```typescript
interface Skill {
  key: string;
  name: string;
  category: string;
  description: string;
}

interface SkillsResponse {
  game: string;
  skills: Skill[];
}

async function getSkills(game: string): Promise<SkillsResponse> {
  const response = await fetch(
    `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/skills?game=${encodeURIComponent(game)}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Usage
const { game, skills } = await getSkills('ATS');

// Group skills by category
const byCategory = skills.reduce((acc, skill) => {
  if (!acc[skill.category]) acc[skill.category] = [];
  acc[skill.category].push(skill);
  return acc;
}, {} as Record<string, Skill[]>);

console.log(`${game} Skills by Category:`);
for (const [category, categorySkills] of Object.entries(byCategory)) {
  console.log(`\n${category.toUpperCase()}:`);
  categorySkills.forEach(s => console.log(`  - ${s.name}: ${s.description}`));
}
```

### Use Cases

**Display skill names in credentials:**
```typescript
const { skills } = await getSkills('ATS');
const skillMap = Object.fromEntries(skills.map(s => [s.key, s.name]));

// Convert skill keys to display names
const credential = {
  skills_verified: ['pre_trip_inspection', 'defensive_driving']
};

const displaySkills = credential.skills_verified.map(key => skillMap[key] || key);
console.log('Skills:', displaySkills.join(', '));
// Output: "Skills: Pre-Trip Inspection, Defensive Driving"
```

**Build a skill selector UI:**
```typescript
const { skills } = await getSkills('ATS');

// Group for multi-select UI
const categories = [...new Set(skills.map(s => s.category))];
const options = categories.map(cat => ({
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
  options: skills
    .filter(s => s.category === cat)
    .map(s => ({ value: s.key, label: s.name }))
}));
```

### Notes

- Only active skills (`is_active = true`) are returned
- Skills are sorted by `sort_order`
- Skill keys are stable identifiers for credential storage
- Categories may vary by game as taxonomy expands
