

# Work Order User Journey: End-to-End UX Audit

## Journey Map + Gaps Identified

```text
DISCOVERY → DETAIL → START → PLAY → SYNC → RESULTS
   ↓          ↓        ↓       ↓       ↓        ↓
  [1,2]      [3]     [4,5]   [6]     [7]     [8,9]
```

### Gap 1: Dashboard WorkOrderCard is a dead end
`WorkOrderCard` (used by `ActiveWorkOrders` on the dashboard) has `cursor-pointer` and a hover arrow button but **no `NavLink` or `onClick`** — clicking does nothing. Users see work orders on the dashboard but can't navigate to them.

**Fix**: Wrap `WorkOrderCard` in a `NavLink to={/work-orders/${workOrder.id}}`.

### Gap 2: Hardcoded fake stats everywhere
- `WorkOrderCard` shows "24 active" — hardcoded
- `EventCard` shows random `participantCount` and `rating` via `Math.random()`
- `WorkOrderDetail` header shows "24 completed" — hardcoded

**Fix**: Query actual completion counts from `user_work_order_completions` or remove the fake numbers.

### Gap 3: No completion status shown on listing cards
`EventCard` accepts an `isCompleted` prop but it's **never passed** from `WorkOrders.tsx` or `Index.tsx`. Users can't tell which work orders they've already completed when browsing.

**Fix**: Cross-reference `user_work_order_completions` in the listing pages and pass `isCompleted` to each card.

### Gap 4: "Continue" button (no external link) does nothing
In the fallback case (no `source_challenge_id`), the "Continue" button renders as `<Button size="lg" variant="secondary">` with **no onClick handler** — it's completely inert.

**Fix**: Add an appropriate action or disable the button with context.

### Gap 5: No loading/pending state on Launch Challenge
When clicking "Launch Challenge", `handleStart` is async but `window.open` fires immediately after — the new tab may open before the completion record is saved. If `handleStart` fails, the user is redirected anyway with no record.

**Fix**: `await handleStart()` before `window.open()`, and don't redirect on failure. (The code does `await` but doesn't check for errors since `handleStart` catches and toasts internally — if it throws, `window.open` still runs.)

### Gap 6: No "return to Academy" prompt on play.fgn.gg
After opening play.fgn.gg in a new tab, there's no mechanism to bring the user back to the Academy to see their results. This is outside Academy's control, but the Academy side could:
- Poll/subscribe for completion updates while the detail page is open
- Show a "Waiting for results..." state

**Fix**: Add realtime subscription or polling on `user_work_order_completions` to auto-refresh status when the user returns to the Academy tab.

### Gap 7: No real-time feedback when sync completes
When the `sync-challenge-completion` webhook fires, the user's detail page doesn't update unless they manually refresh. The `useUserWorkOrderStatus` query uses default stale times.

**Fix**: Either enable Supabase Realtime on `user_work_order_completions` or add short-interval refetching (`refetchInterval`) when status is `in_progress`.

### Gap 8: "Best Score" tracking is incomplete
`useUserWorkOrderStatus` has a `// TODO: Track best score` comment — it returns the latest attempt's score as `bestScore`, not the actual highest score across all attempts.

**Fix**: Query `MAX(score)` across all completions for the work order.

### Gap 9: No notification when results sync
The `sync-challenge-completion` edge function awards XP and credentials but doesn't create a user notification. Users don't know their results arrived unless they revisit the page.

**Fix**: Insert into `notifications` table from the sync edge function (or a DB trigger on completion).

## Priority Ranking

| Priority | Gap | Effort |
|----------|-----|--------|
| P0 | #1 — Dashboard cards not clickable | Trivial (add NavLink) |
| P0 | #4 — "Continue" button does nothing | Trivial (add handler) |
| P1 | #3 — No completion badges on listings | Small (query + prop) |
| P1 | #7 — No auto-refresh on sync | Small (refetchInterval) |
| P1 | #8 — Best score TODO | Small (MAX query) |
| P2 | #2 — Fake stats | Medium (real counts) |
| P2 | #5 — Race condition on launch | Small (error guard) |
| P2 | #9 — No sync notification | Medium (edge fn change) |
| P3 | #6 — Return-to-Academy UX | Medium (realtime sub) |

## Recommended Plan

Fix all P0 and P1 gaps in a single pass across 4 files:

| File | Changes |
|------|---------|
| `src/components/dashboard/WorkOrderCard.tsx` | Wrap in `NavLink to={/work-orders/${workOrder.id}}` |
| `src/pages/WorkOrderDetail.tsx` | Fix inert "Continue" button; add `refetchInterval: 10000` when status is `in_progress`; guard `window.open` behind successful start |
| `src/hooks/useWorkOrderCompletion.ts` | Fix best score: query `MAX(score)` instead of using latest attempt |
| `src/pages/WorkOrders.tsx` | Fetch user completions, pass `isCompleted` to `EventCard` |

P2/P3 gaps (fake stats, notifications, realtime) can follow as separate iterations.

