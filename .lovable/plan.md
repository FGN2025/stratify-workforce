

# Add Fiber-Tech to Work Order Game Assignment & Fix Missing Option

## Problem
The Work Order creation/edit dialog is missing **Fiber-Tech Simulator** from the Game dropdown (lines 470-475 of `WorkOrderEditDialog.tsx`). Similarly, the `WorkOrdersManager.tsx` filter dropdown is missing it. All five simulation tracks should be selectable.

## What Changes

| File | Change |
|------|--------|
| `src/components/admin/WorkOrderEditDialog.tsx` | Add `<SelectItem value="Fiber_Tech">Fiber-Tech Simulator</SelectItem>` to the Game select (after line 474) |
| `src/components/admin/WorkOrdersManager.tsx` | Add `<SelectItem value="Fiber_Tech">Fiber-Tech Simulator</SelectItem>` to the game filter select, and add `Fiber_Tech` entry to the `GAME_LABELS` map |

## Detail
The `game_title` enum already includes `Fiber_Tech` — it's just not rendered as an option in these two components. No database or backend changes needed. The label "Simulation Resource" language in the UI can stay as "Game" since that's the existing convention across the app.

## Also Fixing
The `BookOpen` runtime error on Profile.tsx — will verify if the import exists and fix if missing.

