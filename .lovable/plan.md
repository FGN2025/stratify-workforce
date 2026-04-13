

# Plan: Fix "Continue on Play" Link Using Correct Challenge ID

## Problem
The "Continue on Play" button on `WorkOrderDetail.tsx` builds the play.fgn.gg URL using `source_challenge_id` (an internally auto-generated UUID), but the correct ID for the remote platform is `fgn_origin_challenge_id`. This causes a 404 on play.fgn.gg.

## Fix
In `src/pages/WorkOrderDetail.tsx` (line ~286-288), change the `playUrl` construction to prefer `fgn_origin_challenge_id`, falling back to `source_challenge_id` only if the origin ID is null:

```tsx
const playUrl = workOrder.fgn_origin_challenge_id
  ? `https://play.fgn.gg/challenge/${workOrder.fgn_origin_challenge_id}`
  : workOrder.source_challenge_id
    ? `https://play.fgn.gg/challenge/${workOrder.source_challenge_id}`
    : null;
```

## Files Modified
- `src/pages/WorkOrderDetail.tsx` — one line change to the `playUrl` variable

## Impact
All work orders with a linked `fgn_origin_challenge_id` will now correctly link to their play.fgn.gg challenge page. Work orders without an origin ID fall back to the previous behavior.

