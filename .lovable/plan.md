

# Remaining Audit Gaps: P2 + P3

The P0/P1 fixes are done. Gap #9 (sync notifications) was also already implemented in the edge function. Here's what remains:

## Gap 2 — Hardcoded Fake Stats (P2)

Fake numbers appear in multiple places:

| Location | Fake Data | Fix |
|----------|-----------|-----|
| `WorkOrderCard.tsx` line 64 | `"24"` active (hardcoded) | Query `user_work_order_completions` count per work order, or remove |
| `WorkOrderDetail.tsx` line 248 | `"24"` completed (hardcoded) | Query actual completion count for that work order |
| `EventCard.tsx` line 38-39 | `Math.random()` for participantCount and rating | Query real counts or remove defaults |
| `CommunityCard.tsx` lines 25-27 | `Math.random()` for memberCount, eventCount, rating | Query from `community_memberships` + work orders |
| `CommunityProfile.tsx` lines 115-119 | `Math.random()` mock stats block | Query real membership/completion counts |

## Gap 5 — Race Condition on Launch (P2)

Already partially fixed (the `await mutateAsync` + try/catch). The current code looks correct — `window.open` only fires if `mutateAsync` succeeds. **This gap is resolved.**

## Gap 6 — Return-to-Academy UX (P3)

After opening play.fgn.gg in a new tab, there's no visual indicator on the Academy side. The `refetchInterval` (Gap 7 fix) partially addresses this — when the user returns to the tab, the query will auto-refresh within 10 seconds. A "Waiting for results..." banner could improve this further but is low priority.

## Recommended Next Step

**Fix Gap 2** — Remove all hardcoded/random stats. This is the most user-visible remaining issue.

### Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/WorkOrderCard.tsx` | Query completion count per work order from `user_work_order_completions`, or remove the "24 active" stat |
| `src/pages/WorkOrderDetail.tsx` | Replace hardcoded "24 completed" with a real count query |
| `src/components/marketplace/EventCard.tsx` | Remove `Math.random()` defaults for participantCount/rating; accept real data or show nothing |
| `src/components/marketplace/CommunityCard.tsx` | Remove `Math.random()` defaults; query actual member/event counts or accept them as required props |
| `src/pages/CommunityProfile.tsx` | Replace mock stats block with real queries against `community_memberships` and completions |

### Approach
- Create a shared hook `useWorkOrderCompletionCount(workOrderId)` that returns the count of completions for a given work order
- For community stats, query `community_memberships` for member count and use the existing work orders data for event count
- Remove all `Math.random()` default values — if data isn't available, show nothing or "—"

