

# Plan: Rename "ATS Resources" to "SIM Resources" with Scalable Architecture

## Overview

This plan transforms the current ATS-only sidebar section into a flexible "SIM Resources" framework that can accommodate all four simulation games (and future additions) as individual dropdown menus.

---

## Current State

| Aspect | Current Implementation |
|--------|------------------------|
| Section Label | "ATS Resources" (hardcoded) |
| Config File | `src/config/atsResources.ts` - ATS-only |
| Sidebar State | Single `atsOpen` boolean |
| Game Types | `GameTitle` type already supports: ATS, Farming_Sim, Construction_Sim, Mechanic_Sim |

---

## Proposed Architecture

```text
SIM RESOURCES (Section Label)
├── American Truck Sim ▼
│   ├── CDL Quest (external)
│   └── CDL Exchange (external)
├── Farming Simulator ▼        [Future - disabled/empty for now]
│   └── (Coming Soon)
├── Construction Simulator ▼   [Future - disabled/empty for now]
│   └── (Coming Soon)
└── Mechanic Simulator ▼       [Future - disabled/empty for now]
    └── (Coming Soon)
```

---

## Changes Required

### 1. Rename and Restructure Configuration File

**File: `src/config/atsResources.ts` → `src/config/simResources.ts`**

Create a scalable configuration that maps each `GameTitle` to its external resources:

```text
Structure:
{
  ATS: {
    title: "American Truck Sim",
    icon: Truck,
    accentColor: "#3B82F6",
    resources: [
      { key: "cdlQuest", title: "CDL Quest", ... },
      { key: "cdlExchange", title: "CDL Exchange", ... }
    ]
  },
  Farming_Sim: {
    title: "Farming Simulator",
    icon: Tractor,
    accentColor: "#22C55E",
    resources: []  // Empty = "Coming Soon" state
  },
  Construction_Sim: { ... },
  Mechanic_Sim: { ... }
}
```

### 2. Update Sidebar Component

**File: `src/components/layout/AppSidebar.tsx`**

- Rename section label from "ATS Resources" to "Sim Resources"
- Replace single `atsOpen` state with a record: `openGames: Record<GameTitle, boolean>`
- Loop over all games from config, rendering each as a collapsible dropdown
- Handle "Coming Soon" state for games with no resources yet

### 3. Define TypeScript Interfaces

**File: `src/config/simResources.ts`**

```text
interface SimResource {
  key: string;
  title: string;
  description: string;
  href: string;
  accentColor: string;
  icon: LucideIcon;
}

interface SimGameConfig {
  title: string;
  icon: LucideIcon;
  accentColor: string;
  resources: SimResource[];
}

type SimResourcesConfig = Record<GameTitle, SimGameConfig>;
```

### 4. Maintain Backward Compatibility

Export a legacy `ATS_RESOURCES` constant for any existing code that imports it (Work Orders, Learn, Profile pages).

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/config/atsResources.ts` | Delete | Remove old ATS-only config |
| `src/config/simResources.ts` | Create | New scalable multi-game config |
| `src/components/layout/AppSidebar.tsx` | Modify | Update to use new config and render all games |
| `src/pages/WorkOrders.tsx` | Modify | Update import path |
| `src/pages/Learn.tsx` | Modify | Update import path |
| `src/pages/Profile.tsx` | Modify | Update import path |
| `src/components/marketplace/ExternalResourceCard.tsx` | No change | Already generic enough |

---

## Implementation Details

### simResources.ts Configuration

```text
ATS:
  - CDL Quest (Training) - https://simu-cdl-path.lovable.app
  - CDL Exchange (Careers) - https://skill-truck-path.lovable.app

Farming_Sim:
  - No resources yet (shows "Coming Soon")

Construction_Sim:
  - No resources yet (shows "Coming Soon")

Mechanic_Sim:
  - No resources yet (shows "Coming Soon")
```

### Sidebar Rendering Logic

```text
For each game in SIM_RESOURCES:
  1. Render collapsible trigger with game icon + title
  2. If resources.length > 0:
       Render each resource as external link
  3. Else:
       Render "Coming Soon" placeholder text
```

### State Management

Replace:
```typescript
const [atsOpen, setAtsOpen] = useState(false);
```

With:
```typescript
const [openGames, setOpenGames] = useState<Record<GameTitle, boolean>>({
  ATS: false,
  Farming_Sim: false,
  Construction_Sim: false,
  Mechanic_Sim: false,
});

const toggleGame = (game: GameTitle) => {
  setOpenGames(prev => ({ ...prev, [game]: !prev[game] }));
};
```

---

## Adding Future Games

When you're ready to add a new sim game (e.g., Farming Simulator subsites):

1. Add resources to the `Farming_Sim` entry in `simResources.ts`
2. No code changes needed in the sidebar - it automatically renders

Example addition:
```typescript
Farming_Sim: {
  title: "Farming Simulator",
  icon: Tractor,
  accentColor: "#22C55E",
  resources: [
    {
      key: "farmingAcademy",
      title: "Farming Academy",
      description: "Agricultural training paths",
      href: "https://farming-academy.lovable.app",
      accentColor: "#22C55E",
      icon: GraduationCap,
    }
  ]
}
```

---

## Visual Design

The sidebar will show all four games, giving users visibility into the full FGN ecosystem:

| Game | State | Display |
|------|-------|---------|
| American Truck Sim | Active | Blue truck icon, 2 resource links |
| Farming Simulator | Coming Soon | Green tractor icon, grayed placeholder |
| Construction Sim | Coming Soon | Amber hardhat icon, grayed placeholder |
| Mechanic Sim | Coming Soon | Red wrench icon, grayed placeholder |

"Coming Soon" games are still visible but clearly marked as upcoming, building anticipation while maintaining a consistent UI structure.

---

## Benefits

1. **Single Source of Truth**: All sim resources defined in one config file
2. **Zero-Code Expansion**: Adding new subsites requires only config changes
3. **Type Safety**: Full TypeScript support with `GameTitle` enum
4. **Consistent Styling**: Reuses existing game color/icon mappings from `GameIcon.tsx`
5. **Future-Proof**: Architecture supports unlimited games and resources per game

