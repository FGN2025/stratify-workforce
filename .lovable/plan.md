

# Work Order Detail: Learning Resources + Smart Action Button

## What's Changing

Two enhancements to the Work Order detail page (`/work-orders/:id`):

1. **Smart Action Button** — The "Start Work Order" / "Continue" button becomes context-aware:
   - **Completed with passing score (>=70%)**: Shows results summary; secondary "Try Again" link to play.fgn.gg
   - **In Progress or Not Yet Passing**: Primary button opens `https://play.fgn.gg/challenge/{source_challenge_id}` in a new tab (creates completion record first if not started)
   - **No `source_challenge_id`**: Falls back to current behavior (local start only)

2. **Learning Resources Card** — A new card in the content grid shows the admin-configured SIM Resources for the work order's `game_title` (e.g., CDL Quest for ATS, broadbandworkforce.com for Fiber_Tech). Each resource links out in a new tab.

## Admin Configurability

The learning resources shown on the Work Order detail page are **already fully configurable** via the existing "SIM Resources" admin section (`/admin/sim-resources`). Admins can:
- Add/edit/delete resources per game title
- Set URL, icon, accent color, description
- Toggle active/inactive
- Reorder resources

No admin changes are needed — the Work Order detail page will simply consume the `sim_resources` table filtered by the work order's `game_title`.

## Implementation

### File: `src/pages/WorkOrderDetail.tsx`

**Imports**: Add `useSimResources` hook, `ExternalLink` and `BookOpen` icons.

**Data**: Call `useSimResources(workOrder.game_title)` to fetch active learning resources for the work order's simulator track.

**Action Button (lines 249-260)**: Replace with conditional logic:
```
if (completed with passing score):
  Show completion badge + score in header area
  Secondary "Try Again on Play" external link button

else if (has source_challenge_id):
  Button: "Launch Challenge" / "Continue on Play"
  onClick: create completion record if needed, then window.open(playUrl)

else:
  Keep current local "Start Work Order" behavior
```

Play URL pattern: `https://play.fgn.gg/challenge/${workOrder.source_challenge_id}`

**Learning Resources Card** (new, after XP Rewards card in the grid):
- Only renders if `useSimResources` returns resources for this game
- Each resource shown as a clickable row with icon, title, description, and external link button
- Uses resource's `accent_color` for visual styling
- Opens `resource.href` in new tab on click

### No Other Files Changed

- No database migrations
- No new components (inline card in WorkOrderDetail)
- Admin management already exists at `/admin/sim-resources`

## Files Changed

| File | Change |
|------|--------|
| `src/pages/WorkOrderDetail.tsx` | Add `useSimResources` query, smart action button logic, learning resources card |

