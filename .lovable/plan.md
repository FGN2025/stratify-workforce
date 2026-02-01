
# Fix Fiber Line Installation Work Order

## Problem Summary

The "Fiber Line Installation" work order card is displaying incorrectly:
1. **Wrong game type**: Shows "American Truck Simulator" but should be "Construction Simulator"
2. **Wrong image**: Shows a truck image but should show fiber optics installation/construction imagery

## Root Cause

The work order in the database has `game_title` set to `ATS` instead of `Construction_Sim`. The system automatically shows game cover images based on the `game_title` field, so changing this will update the card's game icon and associated imagery.

## Solution

### 1. Update Work Order Game Type

Change the `game_title` from `ATS` to `Construction_Sim` for the "Fiber Line Installation" work order.

| Field | Current Value | New Value |
|-------|---------------|-----------|
| game_title | ATS | Construction_Sim |

### 2. Update Construction Simulator Cover Image

Replace the generic construction equipment image with a fiber optics installation image for better relevance:

| Field | Current Value | New Value |
|-------|---------------|-----------|
| url | Generic construction equipment | Fiber optic cable installation scene |
| alt_text | "Construction equipment at work" | "Fiber optic cable installation" |

## What Will Change

After the fix:
- The card will display the **hard hat icon** (Construction Sim) instead of the **truck icon** (ATS)
- The card will show **"Construction Simulator"** as the game type
- The cover image will show fiber optics/underground cable installation work

## Database Updates Required

Two SQL updates will be executed:
1. Update `work_orders` table - change game_title for Fiber Line Installation
2. Update `site_media` table - update construction_sim_cover image URL to show fiber optics installation

## Files Changed

No code file changes are needed - this is purely a data correction in the database. The existing `EventCard` component and `useGameCoverImages` hook will automatically display the correct image based on the updated `game_title`.
