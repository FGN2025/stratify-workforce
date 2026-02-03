
# Plan: Add Fiber-Tech Simulator as a New SIM Game

## Overview

Add "Fiber-Tech Simulator" as a fifth game title in the SIM Resources ecosystem, complete with admin-controlled management, fiber optics-specific skills taxonomy, and a structured multi-step learning progression inspired by the broadband technician development funnel.

---

## Architecture

```text
FIBER-TECH SIMULATOR LEARNING FUNNEL
────────────────────────────────────────────────────────────────────

Stage 1: Awareness & Discovery
  │  • Discover Fiber-Tech track in Marketplace
  │  • View introductory content and career path overview
  │  • Join FGN Academy with Fiber-Tech track selected
  │
  ▼
Stage 2: Foundational Skills
  │  • Complete safety certifications (OSHA, ladder safety)
  │  • Learn fiber optic theory and cable types
  │  • Practice basic tool handling in simulation
  │
  ▼
Stage 3: Hands-On Simulation
  │  • Execute work orders: splicing, termination, testing
  │  • Earn XP through successful scenario completions
  │  • Build skill passport with verified competencies
  │
  ▼
Stage 4: Verification & Certification
  │  • Pass practical assessments with evidence review
  │  • Earn verifiable credentials (Fiber Installer Cert)
  │  • Portfolio ready for employer verification
  │
  ▼
Stage 5: Career Connection
     • Profile visible to broadband provider employers
     • Credential verification via CDL Exchange equivalent
     • Job matching through community partnerships
```

---

## Database Changes

### 1. Add New Game Title Enum Value

```sql
-- Add Fiber_Tech to game_title enum
ALTER TYPE public.game_title ADD VALUE 'Fiber_Tech';
```

### 2. Create Game Channel for Fiber-Tech

```sql
-- Insert Fiber-Tech game channel
INSERT INTO public.game_channels (
  game_title,
  name,
  description,
  accent_color
) VALUES (
  'Fiber_Tech',
  'Fiber-Tech Simulator',
  'Master fiber optic installation, splicing, and testing through immersive simulation training. Build skills demanded by broadband providers and telecommunications employers.',
  '#8B5CF6'  -- Purple accent for telecommunications
);
```

### 3. Seed Fiber-Tech Skills Taxonomy

```sql
-- Fiber-Tech skill categories aligned with industry certifications
INSERT INTO public.skills_taxonomy (game_title, skill_key, skill_name, category, description, sort_order) VALUES
  -- Safety Category
  ('Fiber_Tech', 'ladder_safety', 'Ladder & Height Safety', 'safety', 'Proper ladder setup, fall protection, and aerial work practices', 1),
  ('Fiber_Tech', 'ppe_compliance', 'PPE Compliance', 'safety', 'Correct use of safety glasses, gloves, and protective equipment', 2),
  ('Fiber_Tech', 'trench_safety', 'Trench & Excavation Safety', 'safety', 'Safe practices for underground fiber installation', 3),
  
  -- Precision Category
  ('Fiber_Tech', 'fiber_splicing', 'Fiber Splicing', 'precision', 'Fusion and mechanical splicing techniques for single and multi-mode fiber', 4),
  ('Fiber_Tech', 'connector_termination', 'Connector Termination', 'precision', 'Polishing and terminating fiber connectors to specification', 5),
  ('Fiber_Tech', 'cable_routing', 'Cable Routing & Management', 'precision', 'Proper bend radius, tie-down, and pathway management', 6),
  
  -- Efficiency Category
  ('Fiber_Tech', 'otdr_testing', 'OTDR Testing', 'efficiency', 'Operating optical time-domain reflectometer for fault detection', 7),
  ('Fiber_Tech', 'power_meter', 'Light Source & Power Meter', 'efficiency', 'End-to-end loss testing and verification', 8),
  ('Fiber_Tech', 'documentation', 'Field Documentation', 'efficiency', 'Accurate recording of installation data and as-builts', 9),
  
  -- Equipment Care Category
  ('Fiber_Tech', 'tool_maintenance', 'Tool Maintenance', 'equipment_care', 'Proper cleaning and care of splicing equipment and cleavers', 10),
  ('Fiber_Tech', 'fiber_handling', 'Fiber Handling', 'equipment_care', 'Correct handling to prevent microbends and contamination', 11),
  ('Fiber_Tech', 'vehicle_equipment', 'Vehicle & Equipment Care', 'equipment_care', 'Maintenance of service vehicles and mounted equipment', 12);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/tenant.ts` | Add `'Fiber_Tech'` to `GameTitle` union type |
| `src/config/simResources.ts` | Add Fiber-Tech game configuration |
| `src/components/dashboard/GameIcon.tsx` | Add Fiber-Tech icon (Cable or Radio icon) |
| `src/components/admin/SimGamesManager.tsx` | Add Fiber-Tech to game icons and labels |
| `src/components/admin/SimResourceEditDialog.tsx` | Add Fiber-Tech to game options |
| `src/components/admin/SimResourcesManager.tsx` | Add Fiber-Tech to game config |
| `docs/api/public-catalog/games.md` | Document new Fiber_Tech game in API docs |

---

## Implementation Details

### 1. TypeScript Type Update

```typescript
// src/types/tenant.ts
export type GameTitle = 'ATS' | 'Farming_Sim' | 'Construction_Sim' | 'Mechanic_Sim' | 'Fiber_Tech';
```

### 2. SIM Resources Configuration

```typescript
// src/config/simResources.ts
import { Cable } from 'lucide-react';  // or Radio icon

Fiber_Tech: {
  title: 'Fiber-Tech Simulator',
  shortTitle: 'Fiber-Tech',
  icon: Cable,
  accentColor: '#8B5CF6',  // Purple
  resources: [], // Admin-managed via database
},
```

### 3. Game Icon Component

```typescript
// src/components/dashboard/GameIcon.tsx
import { Cable } from 'lucide-react';

Fiber_Tech: { 
  icon: Cable, 
  label: 'Fiber-Tech Simulator',
  color: 'text-purple-400 bg-purple-500/20'
},
```

### 4. Admin Game Management Updates

All admin components that display game options need to include Fiber_Tech:

```typescript
// Game icons mapping
Fiber_Tech: <Cable className="h-6 w-6" />,

// Game labels mapping  
Fiber_Tech: 'Fiber-Tech Simulator',

// Color configuration
Fiber_Tech: { title: 'Fiber-Tech Simulator', icon: Cable, color: '#8B5CF6' },
```

---

## Suggested Initial SIM Resources (Admin-Created)

These resources can be added through the Admin Dashboard after implementation:

| Resource | Description | Type |
|----------|-------------|------|
| **Fiber Fundamentals** | Interactive course on fiber optic theory and cable types | Learning Path |
| **Splicing Academy** | Step-by-step fusion splicing training with telemetry | Simulation |
| **OTDR Certification** | Testing equipment training and certification path | Certification |
| **Field Ready Assessment** | Final practical evaluation for employer verification | Assessment |

---

## Learning Path Integration

The multi-step learning funnel will leverage existing LMS infrastructure:

1. **Courses Table**: Create Fiber-Tech specific courses with modules
2. **Work Orders**: Fiber installation scenarios with success criteria
3. **Skills Taxonomy**: 12 skills across 4 categories (already defined above)
4. **Credentials**: Fiber Installer certification credential type

---

## UI Consistency

Fiber-Tech will follow the established patterns:

```text
┌─────────────────────────────────────────────────────────────────┐
│  SIM RESOURCES (Sidebar)                                        │
├─────────────────────────────────────────────────────────────────┤
│  ▼ American Truck Sim                                           │
│      • CDL Quest                                                │
│      • CDL Exchange                                             │
│  ▼ Fiber-Tech Simulator                          [NEW]          │
│      • Fiber Fundamentals                                       │
│      • Splicing Academy                                         │
│      • OTDR Certification                                       │
│  ▶ Farming Simulator               (Coming Soon)                │
│  ▶ Construction Simulator          (Coming Soon)                │
│  ▶ Mechanic Simulator              (Coming Soon)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme

| Game | Primary Color | Usage |
|------|--------------|-------|
| ATS | Blue (#3B82F6) | Trucking/CDL |
| Farming_Sim | Green (#22C55E) | Agriculture |
| Construction_Sim | Amber (#F59E0B) | Heavy Equipment |
| Mechanic_Sim | Red (#EF4444) | Automotive |
| **Fiber_Tech** | **Purple (#8B5CF6)** | **Telecommunications** |

---

## Implementation Order

1. **Database Migration**: Add `Fiber_Tech` to game_title enum
2. **Database Migration**: Create game channel entry
3. **Database Migration**: Seed skills taxonomy
4. **Frontend Types**: Update `GameTitle` in tenant.ts
5. **Config Updates**: Add to simResources.ts configuration
6. **Component Updates**: Update all game icon/label mappings
7. **Documentation**: Update API docs for public catalog
8. **Testing**: Verify admin can create/manage Fiber-Tech resources
9. **Content Seeding**: Admin adds initial SIM Resources through UI

---

## Summary

This implementation:

1. **Extends the Platform** - Adds Fiber-Tech as fifth game title with full admin control
2. **Industry Alignment** - Skills taxonomy maps to real fiber technician competencies
3. **Learning Funnel** - Structured 5-stage progression from awareness to employment
4. **Broadband Focus** - Connects to existing broadband_provider tenant category
5. **Admin Controlled** - All resources manageable through existing SIM Resources admin UI
6. **Pattern Compliance** - Follows established conventions for icons, colors, and components
