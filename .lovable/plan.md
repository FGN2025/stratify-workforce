

# Plan: Add Grid View Toggle to Work Orders Management

## Overview
Add a list/grid view toggle to the admin Work Orders Management page. The list view is the current table. The grid view will reuse the existing `EventCard` component (already used on the public Work Orders page) to display work orders as visual cards with cover images, difficulty badges, and XP rewards.

## Changes

### `src/components/admin/WorkOrdersManager.tsx`
1. **Add view mode state**: `const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')`
2. **Add toggle buttons** next to the "Create Work Order" button — two icon buttons (`List` and `LayoutGrid` from lucide-react) with active state styling
3. **Conditionally render** either the existing table (list mode) or a responsive card grid (grid mode)
4. **Grid view**: Render each filtered work order using a card layout showing:
   - Cover image (or game-specific fallback)
   - Title (linked to `/work-orders/:id` with `state={{ from: 'admin' }}`)
   - Game label, difficulty badge, XP reward
   - Active status toggle
   - Edit/Delete action buttons in a footer row
   - Uses the existing `GAME_LABELS` and `DIFFICULTY_COLORS` constants already in the file

The grid will use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` for responsive layout.

### No other files modified
All logic (fetching, filtering, dialogs, delete confirmation) stays unchanged. Only the rendering section between the filters and the dialogs is affected.

