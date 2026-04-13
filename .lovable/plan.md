

# Plan: Add Game Cover Image Fallbacks to Admin Grid View

## Problem
10 work orders have no `cover_image_url` in the database. The admin grid view shows a plain letter initial ("F", "R") for these, while the student-facing marketplace cards already use game-specific fallback images via the `useGameCoverImages` hook.

## Root Cause
Not a bug — these challenges were imported from play.fgn.gg without cover images. The admin grid view simply lacks the same fallback logic that the marketplace view already has.

## Fix

### `src/components/admin/WorkOrdersManager.tsx`
1. Import `useGameCoverImages` from `@/hooks/useSiteMedia`
2. Call `const { gameCoverImages } = useGameCoverImages()` in the component
3. In the grid card image section, replace the letter-initial fallback with the game cover image:

```tsx
// Current fallback (letter initial):
<span className="text-2xl font-bold text-muted-foreground/30">
  {GAME_LABELS[wo.game_title]?.charAt(0) || '?'}
</span>

// New fallback (game cover image, then letter):
{gameCoverImages[wo.game_title] ? (
  <img src={gameCoverImages[wo.game_title]} ... />
) : (
  <span ...>{GAME_LABELS[wo.game_title]?.charAt(0) || '?'}</span>
)}
```

This matches the exact pattern used in `src/components/marketplace/EventCard.tsx` (line 55).

### No other files changed
Single file edit. The hook and fallback images already exist.

