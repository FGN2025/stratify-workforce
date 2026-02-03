# Implementation Plan

## Current Status: Fiber-Tech Simulator ✅ COMPLETE

### Fiber-Tech Simulator Integration

Added "Fiber-Tech Simulator" as the fifth simulation game with full admin control.

**Database Changes (Complete):**
- ✅ Added `Fiber_Tech` to `game_title` enum
- ✅ Created game channel with purple accent (#8B5CF6)
- ✅ Seeded 12 skills in taxonomy across 4 categories:
  - Safety: Ladder & Height Safety, PPE Compliance, Trench Safety
  - Precision: Fiber Splicing, Connector Termination, Cable Routing
  - Efficiency: OTDR Testing, Power Meter, Field Documentation
  - Equipment Care: Tool Maintenance, Fiber Handling, Vehicle Equipment

**Frontend Updates (Complete):**
- ✅ Updated `GameTitle` type to include `Fiber_Tech`
- ✅ Added Cable icon from lucide-react
- ✅ Updated all admin components (SimGamesManager, SimResourceEditDialog, etc.)
- ✅ Updated sidebar resource grouping
- ✅ API docs updated for 5-game response

---

## Architecture Overview

```text
SIMULATION GAMES
────────────────────────────────────────────────────────────────────
│
├── ATS (American Truck Simulator) - Blue #3B82F6
│   ├── CDL Quest
│   └── CDL Exchange
│
├── Fiber_Tech (Fiber-Tech Simulator) - Purple #8B5CF6 [NEW]
│   └── Admin-managed resources via SIM Resources tab
│
├── Farming_Sim - Green #22C55E (Coming Soon)
│
├── Construction_Sim - Amber #F59E0B (Coming Soon)
│
└── Mechanic_Sim - Red #EF4444 (Coming Soon)
```

---

## Fiber-Tech Learning Funnel

```text
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

## Admin Actions Available

Admins can now:
- Add SIM Resources via Admin → SIM Resources → Add Resource → Select "Fiber-Tech Simulator"
- Create Work Orders for Fiber_Tech game
- Create Courses with Fiber-Tech modules
- Configure Credentials for fiber technician certifications

---

## Previous Completion: Discord OAuth Integration

- Added `user_discord_connections` table with RLS policies
- Created `discord-oauth` edge function with graceful degradation
- Admin can manage all Discord connections via Admin dashboard
- User-facing connection UI in Settings
- Profile header shows Discord badge when connected

**Pending Configuration:**
- `DISCORD_CLIENT_ID` secret
- `DISCORD_CLIENT_SECRET` secret
- `VITE_DISCORD_CLIENT_ID` env variable
