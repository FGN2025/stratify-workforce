# Update FGN.academy Logo and Favicon

## Problem
The current `public/favicon.png` is a 1024x1024 RGB image with a grey background and grey icon (book+gear silhouette). It needs:
1. Transparent background (no grey)
2. Icon recolored to match the green used in page text and buttons

## Clarification Needed
The current theme primary color is amber/gold (`#f49d14`). You mentioned matching "the color green in the text and buttons." Could you confirm the specific green you'd like? Options:
- Emerald green (`#10b981`)
- A specific hex code you have in mind
- Or should the primary color itself be changed to green across the site?

## Approach (once color is confirmed)

### Step 1: Regenerate the favicon PNG
- Use Python (Pillow) to process `public/favicon.png`
- Remove the grey background by converting grey pixels to transparent (RGBA)
- Recolor the icon silhouette from grey/white to the target green
- Save as `public/favicon.png` (transparent PNG)

### Step 2: Update the sidebar logo display
- **`src/components/layout/AppSidebar.tsx`** — The logo already references `/favicon.png`, so no path change needed. The transparent background will work naturally against the dark sidebar.

### Step 3: Verify
- Confirm the browser tab favicon renders correctly with transparency
- Confirm the sidebar logo looks correct on the dark background

## Files Changed

| File | Change |
|------|--------|
| `public/favicon.png` | Regenerated: transparent background, green-colored icon |

No code file changes needed — `index.html` and `AppSidebar.tsx` already reference `/favicon.png`.
