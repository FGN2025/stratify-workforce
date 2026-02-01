

# Work Orders Management Tab - Implementation Plan

## Overview

Add a comprehensive Work Orders Management tab to the Admin Dashboard, enabling administrators to create, edit, activate/deactivate, delete, and filter work orders across all simulation games.

---

## Current State Analysis

| Component | Status |
|-----------|--------|
| `work_orders` table | Exists with full schema and admin RLS policies |
| `useWorkOrders` hook | Read-only, filters by active work orders |
| Admin Dashboard | Has tabs for Users, SIM Games, Media Library |
| Work Orders Management UI | **Not implemented** |

---

## Database Schema (Already Exists)

The `work_orders` table has these fields:

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `title` | text | Required |
| `description` | text | Optional |
| `game_title` | enum | ATS, Farming_Sim, Construction_Sim, Mechanic_Sim |
| `difficulty` | enum | beginner, intermediate, advanced |
| `xp_reward` | integer | Default: 50 |
| `estimated_time_minutes` | integer | Optional |
| `max_attempts` | integer | Optional |
| `success_criteria` | jsonb | Default: {min_score: 80, max_damage: 5} |
| `is_active` | boolean | Default: true |
| `channel_id` | uuid | FK to game_channels |
| `tenant_id` | uuid | FK to tenants |
| `created_at` | timestamp | Auto-generated |

RLS policies already allow admins to INSERT, UPDATE, DELETE.

---

## Implementation Plan

### 1. Create WorkOrdersManager Component

New file: `src/components/admin/WorkOrdersManager.tsx`

**Features:**
- Tabular view of all work orders (active and inactive)
- Columns: Title, Game, Difficulty, XP, Status, Time, Actions
- Filter bar for game type and difficulty
- Quick toggle for active/inactive status
- Edit and Delete action buttons
- Create new work order button

**UI Layout:**

```text
Work Orders Management
Configure training scenarios for simulation games

[+ Create Work Order]                    [Game: All ▼] [Difficulty: All ▼]

+------------------------------------------------------------------------+
| Title          | Game     | Difficulty | XP  | Time | Status | Actions |
+------------------------------------------------------------------------+
| Highway Run    | ATS      | Beginner   | 50  | 30m  | Active | [✓][✎][🗑]|
| Farm Harvest   | Farming  | Advanced   | 100 | 60m  | Active | [✓][✎][🗑]|
+------------------------------------------------------------------------+
```

### 2. Create WorkOrderEditDialog Component

New file: `src/components/admin/WorkOrderEditDialog.tsx`

**Features:**
- Modal dialog for create/edit operations
- Form fields for all work order properties
- Game channel auto-selection based on game_title
- JSON editor for success criteria
- Tenant assignment (optional)

**Form Layout:**

```text
+-----------------------------------------+
| Create Work Order                       |
+-----------------------------------------+
| Title *           [________________]    |
| Description       [________________]    |
|                   [________________]    |
| Game *            [ATS ▼]               |
| Difficulty *      [Beginner ▼]          |
| XP Reward *       [50]                  |
| Est. Time (min)   [30]                  |
| Max Attempts      [___]                 |
| Success Criteria                        |
|   Min Score       [80] %                |
|   Max Damage      [5]                   |
| Tenant (optional) [None ▼]              |
|                                         |
|              [Cancel]  [Save]           |
+-----------------------------------------+
```

### 3. Update Admin.tsx

Add "Work Orders" tab to the existing tabbed interface:

```typescript
<TabsList>
  <TabsTrigger value="users">User Management</TabsTrigger>
  <TabsTrigger value="work-orders">Work Orders</TabsTrigger>  // NEW
  <TabsTrigger value="games">SIM Games</TabsTrigger>
  <TabsTrigger value="media">Media Library</TabsTrigger>
</TabsList>
```

---

## New Files

| File | Description |
|------|-------------|
| `src/components/admin/WorkOrdersManager.tsx` | Main management grid component |
| `src/components/admin/WorkOrderEditDialog.tsx` | Create/Edit modal dialog |

---

## Technical Details

### WorkOrdersManager.tsx

```typescript
// State management
const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [gameFilter, setGameFilter] = useState<GameTitle | 'all'>('all');
const [difficultyFilter, setDifficultyFilter] = useState<WorkOrderDifficulty | 'all'>('all');
```

### CRUD Operations

```typescript
// Fetch all work orders (including inactive for admin view)
const fetchWorkOrders = async () => {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .order('created_at', { ascending: false });
  // No is_active filter - admins see all
};

// Toggle active status
const handleToggleActive = async (id: string, currentStatus: boolean) => {
  await supabase
    .from('work_orders')
    .update({ is_active: !currentStatus })
    .eq('id', id);
};

// Delete work order
const handleDelete = async (id: string) => {
  // Confirmation dialog first
  await supabase
    .from('work_orders')
    .delete()
    .eq('id', id);
};

// Create/Update
const handleSave = async (data: WorkOrderFormData) => {
  if (editingWorkOrder) {
    await supabase.from('work_orders').update(data).eq('id', editingWorkOrder.id);
  } else {
    await supabase.from('work_orders').insert(data);
  }
};
```

### WorkOrderEditDialog.tsx

Form validation and state:

```typescript
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [gameTitle, setGameTitle] = useState<GameTitle | ''>('');
const [difficulty, setDifficulty] = useState<WorkOrderDifficulty>('beginner');
const [xpReward, setXpReward] = useState(50);
const [estimatedTime, setEstimatedTime] = useState<number | null>(30);
const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
const [successCriteria, setSuccessCriteria] = useState({
  min_score: 80,
  max_damage: 5
});
const [isActive, setIsActive] = useState(true);
const [tenantId, setTenantId] = useState<string | null>(null);
```

---

## Component Dependencies

```text
WorkOrdersManager
├── imports supabase client
├── imports WorkOrderEditDialog
├── imports UI components (Table, Button, Badge, Select, Switch)
├── imports lucide icons (Plus, Edit, Trash2, etc.)
└── uses game title/difficulty enums from types

WorkOrderEditDialog
├── imports Dialog components
├── imports Form components (Input, Select, Textarea, Switch)
├── fetches game_channels for channel_id linking
├── fetches tenants for optional assignment
└── validates required fields before save
```

---

## Admin Dashboard Update

Modify `src/pages/Admin.tsx` to:

1. Import `WorkOrdersManager` component
2. Add "Work Orders" tab before "SIM Games"
3. Include work orders count in admin stats

---

## UI Components Used

| Component | Purpose |
|-----------|---------|
| `Table` | List work orders in rows |
| `Select` | Filter dropdowns, game/difficulty selectors |
| `Switch` | Quick toggle for is_active |
| `Badge` | Display difficulty, game type |
| `Dialog` | Edit/Create modal |
| `Input` | Text fields |
| `Textarea` | Description field |
| `Button` | Actions |
| `AlertDialog` | Delete confirmation |

---

## Filtering Logic

```typescript
const filteredWorkOrders = useMemo(() => {
  return workOrders.filter(wo => {
    const matchesGame = gameFilter === 'all' || wo.game_title === gameFilter;
    const matchesDifficulty = difficultyFilter === 'all' || wo.difficulty === difficultyFilter;
    return matchesGame && matchesDifficulty;
  });
}, [workOrders, gameFilter, difficultyFilter]);
```

---

## Success Criteria Editor

A simple key-value editor for the jsonb field:

```typescript
// Common criteria options
const criteriaFields = [
  { key: 'min_score', label: 'Minimum Score (%)', type: 'number' },
  { key: 'max_damage', label: 'Max Damage', type: 'number' },
  { key: 'time_limit', label: 'Time Limit (sec)', type: 'number' },
];
```

---

## Summary

This implementation adds a full Work Orders Management tab to the Admin Dashboard with:

- **Create**: New work orders with all configurable fields
- **Edit**: Modify existing work orders via dialog
- **Activate/Deactivate**: Quick toggle without opening dialog
- **Delete**: With confirmation dialog
- **Filter**: By game type and difficulty level

The design follows the established patterns from `SimGamesManager` and `MediaLibrary` components, ensuring consistency across the admin interface.

