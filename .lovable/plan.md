

## Swap ATS / Fiber-Tech Colors and Enable Dynamic Color Editing

### What Changes

**Color Swap (immediate):**
- ATS changes from blue to purple/violet across the app
- Fiber-Tech changes from purple to blue across the app

**Dynamic Admin Color Editing:**
- Game icon colors throughout the app will read from the database (`game_channels.accent_color`) instead of being hardcoded
- When an admin edits a game's "Brand Color" in the SIM Games tab, the change propagates everywhere: sidebar icons, dashboard, filters, cards, and resource displays
- Hardcoded fallback colors remain for safety if the database hasn't been configured

---

### Technical Details

#### 1. New Hook: `useGameChannelColors.ts`

A lightweight hook that fetches `game_title` and `accent_color` from the `game_channels` table and exposes a lookup map. This will be the single source of truth for game colors across the app.

```text
Returns: Record<GameTitle, string>
e.g. { ATS: '#8B5CF6', Fiber_Tech: '#3B82F6', ... }
```

#### 2. Update Hardcoded Colors (Swap + New Defaults)

Files with hardcoded game colors that need the swap applied as new fallback defaults:

- **`src/config/simResources.ts`** -- ATS accent `#3B82F6` to `#8B5CF6`, Fiber_Tech `#8B5CF6` to `#3B82F6`, CDL Quest accent updated
- **`src/components/dashboard/GameIcon.tsx`** -- Swap Tailwind classes: ATS from `text-blue-400 bg-blue-500/20` to `text-purple-400 bg-purple-500/20`, Fiber_Tech vice versa. Also accept an optional `colorOverride` prop from the new hook.
- **`src/components/admin/SimResourcesManager.tsx`** -- Swap hex values in `GAME_CONFIG`: ATS from `#3B82F6` to `#8B5CF6`, Fiber_Tech from `#8B5CF6` to `#3B82F6`. Then integrate the hook so colors come from the DB when available.

#### 3. Update `GameIcon` Component

Modify `GameIcon` to accept an optional `accentColor` prop (hex string). When provided, it uses inline `style` for color and background instead of hardcoded Tailwind classes. This allows parent components that have DB data to pass dynamic colors.

#### 4. Update `SimResourcesManager`

Replace the static `GAME_CONFIG` color values with colors fetched from `useGameChannelColors`, falling back to the hardcoded defaults.

#### 5. Files Changed

| File | Change |
|------|--------|
| `src/hooks/useGameChannelColors.ts` | New hook -- fetches game colors from DB |
| `src/config/simResources.ts` | Swap ATS/Fiber-Tech hex defaults |
| `src/components/dashboard/GameIcon.tsx` | Swap defaults, accept dynamic color prop |
| `src/components/admin/SimResourcesManager.tsx` | Swap defaults, use DB colors via hook |

#### 6. Implementation Sequence

1. Create `useGameChannelColors` hook
2. Swap hardcoded colors in all three files (simResources.ts, GameIcon.tsx, SimResourcesManager.tsx)
3. Wire `GameIcon` to accept dynamic color override
4. Wire `SimResourcesManager` to use hook for dynamic colors
5. Verify end-to-end that admin color changes propagate

