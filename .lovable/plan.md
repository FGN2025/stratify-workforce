

# Plan: Add Fiber_Tech and Roadcraft Cover Images

## Problem
The `useGameCoverImages()` hook in `src/hooks/useSiteMedia.ts` only maps 4 game titles (ATS, Farming_Sim, Construction_Sim, Mechanic_Sim). The newer `Fiber_Tech` and `Roadcraft` channels have no fallback cover images, so their work order cards render broken `<img>` tags.

## Changes

### 1. Update `src/hooks/useSiteMedia.ts`

- Add `fiber_tech_cover` and `roadcraft_cover` to the `fallbackMedia` map with appropriate Unsplash placeholder images
- Add those keys to the `locationKeys` array in `useGameCoverImages()`
- Add `Fiber_Tech` and `Roadcraft` entries to the `gameCoverImages` record

### 2. No database or migration changes needed

The `site_media` table lookup is optional — the fallback URLs handle the default case. Admins can later upload custom covers through the Media Library.

## Result
All Fiber_Tech and Roadcraft work order cards will display a cover image instead of a broken image placeholder.

