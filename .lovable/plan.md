

# Plan: FGN Ecosystem Integration Architecture

## Business Context Understanding

Based on your explanation, here's how the ecosystem is structured:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FGN BUSINESS ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         FGN.BUSINESS (Master Hub)                          │ │
│  │         B2B Portal for Business Customers                                   │ │
│  │         • Broadband Operators  • Workforce Agencies                        │ │
│  │         • Employers            • Schools                                   │ │
│  │                                                                             │ │
│  │    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │ │
│  │    │   Pillar 1  │  │   Pillar 2  │  │   Pillar 3  │  │   Pillar 4  │     │ │
│  │    │  Esports    │  │  SIM Games  │  │  Workforce  │  │  Learning   │     │ │
│  │    │  (Gaming)   │  │  (Skills)   │  │  (Careers)  │  │  (LMS)      │     │ │
│  │    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │ │
│  └───────────┼────────────────┼────────────────┼────────────────┼────────────┘ │
│              │                │                │                │               │
│              ▼                ▼                ▼                ▼               │
│                                                                                  │
│  ┌────────────────┐  ┌─────────────────────────────────────────┐               │
│  │  COMPETITIVE   │  │            SIMULATION GAMES              │               │
│  │    GAMING      │  │            (FGN.ACADEMY)                 │               │
│  ├────────────────┤  ├─────────────────────────────────────────┤               │
│  │                │  │                                          │               │
│  │ FGN.gg /       │  │  ┌─────────────────────────────────────┐│               │
│  │ fibergaming    │  │  │     SKILL PASSPORT (Universal)      ││               │
│  │ network.com    │  │  │  Cross-platform credential system   ││               │
│  │                │  │  │  Shareable verification hashes      ││               │
│  │ • Fortnite     │  │  └──────────────────┬──────────────────┘│               │
│  │ • MarioKart    │  │                     │                   │               │
│  │ • Esports      │  │  ┌──────────────────┼──────────────────┐│               │
│  │ • Prizes       │  │  │                  │                  ││               │
│  │                │  │  ▼                  ▼                  ▼│               │
│  │                │  │ ┌────┐  ┌────────┐  ┌──────────┐  ┌────┐│               │
│  │                │  │ │ATS │  │Farming │  │Construct.│  │Mech││               │
│  │                │  │ │    │  │  Sim   │  │   Sim    │  │Sim ││               │
│  │                │  │ └──┬─┘  └────────┘  └──────────┘  └────┘│               │
│  │                │  │    │                                     │               │
│  └────────────────┘  └────┼─────────────────────────────────────┘               │
│                           │                                                     │
│                           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐               │
│  │                   ATS VERTICAL (CDL Pathway)                 │               │
│  ├─────────────────────────────────────────────────────────────┤               │
│  │                                                              │               │
│  │   ┌───────────────────┐     ┌────────────────────┐          │               │
│  │   │    CDL QUEST      │     │   CDL EXCHANGE     │          │               │
│  │   │   (Training)      │     │   (Marketplace)    │          │               │
│  │   │                   │     │                    │          │               │
│  │   │ • Training Catalog│◄───►│ • CDL Passkey      │          │               │
│  │   │ • Skill Practice  │     │ • Job Matching     │          │               │
│  │   │ • Work Orders     │     │ • Employer Connect │          │               │
│  │   │ • Progress Track  │     │ • Credential Verify│          │               │
│  │   └───────────────────┘     └────────────────────┘          │               │
│  │                                                              │               │
│  │          ▲                           ▲                       │               │
│  │          │    SHARED DATA LAYER      │                       │               │
│  │          │    • CDL Passkey ═════════╪═══► Skill Passport   │               │
│  │          │    • Skills Mapping        │                       │               │
│  │          │    • Work Order Catalog    │                       │               │
│  │          └────────────────────────────┘                       │               │
│  │                                                              │               │
│  └─────────────────────────────────────────────────────────────┘               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Insight: Domain Separation is Intentional

Your architecture correctly separates concerns:

| Site | Purpose | Community | Primary Data |
|------|---------|-----------|--------------|
| **FGN.business** | B2B Portal | Business Customers | Account management, analytics |
| **FGN.gg** | Competitive Gaming | Casual Gamers | Tournament standings, prizes |
| **FGN.Academy** | Skills Development | Trainees | Skill Passport, all SIM games |
| **CDL Quest** | CDL Training | CDL Trainees | ATS curriculum, practice |
| **CDL Exchange** | CDL Marketplace | CDL Trainees + Employers | CDL Passkey, job matching |

The sites should remain **separate** because they serve different communities with different data needs. However, they share specific **credential and skills data** that needs to flow between them.

---

## Proposed Integration: Selective Data Sharing via Credential API

Instead of merging backends, we create a **Credential Interchange Protocol** that allows verified skills data to flow between sites while keeping each site independent.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    CREDENTIAL INTERCHANGE PROTOCOL                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      FGN.ACADEMY (Source of Truth)                   │ │
│  │                                                                      │ │
│  │   ┌──────────────────────────────────────────────────────────────┐  │ │
│  │   │                    SKILL PASSPORT                             │  │ │
│  │   │                                                               │  │ │
│  │   │   user_id + passport_hash + public_url_slug                  │  │ │
│  │   │                       │                                       │  │ │
│  │   │                       ▼                                       │  │ │
│  │   │   ┌─────────────────────────────────────────────────────┐    │  │ │
│  │   │   │              SKILL CREDENTIALS                       │    │  │ │
│  │   │   │   • verification_hash (tamper-proof)                │    │  │ │
│  │   │   │   • skills_verified[]                               │    │  │ │
│  │   │   │   • credential_type (course, cert, skill_verify)    │    │  │ │
│  │   │   │   • issuer + issued_at + expires_at                 │    │  │ │
│  │   │   └─────────────────────────────────────────────────────┘    │  │ │
│  │   │                       │                                       │  │ │
│  │   └───────────────────────┼───────────────────────────────────────┘  │ │
│  │                           │                                          │ │
│  │                           ▼                                          │ │
│  │   ┌──────────────────────────────────────────────────────────────┐  │ │
│  │   │              CREDENTIAL API (Edge Function)                   │  │ │
│  │   │                                                               │  │ │
│  │   │   POST /credentials/verify                                   │  │ │
│  │   │     → Verify a credential by hash                            │  │ │
│  │   │                                                               │  │ │
│  │   │   GET /passport/:slug                                        │  │ │
│  │   │     → Public passport view (if is_public=true)               │  │ │
│  │   │                                                               │  │ │
│  │   │   GET /credentials/:user_id (authenticated)                  │  │ │
│  │   │     → User's credentials for authorized apps                 │  │ │
│  │   │                                                               │  │ │
│  │   │   POST /credentials/issue (authorized apps only)             │  │ │
│  │   │     → CDL Quest/Exchange can issue credentials               │  │ │
│  │   │                                                               │  │ │
│  │   └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                          │                                 │
│              ┌───────────────────────────┼───────────────────────────┐    │
│              │                           │                           │    │
│              ▼                           ▼                           ▼    │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────┐ │
│  │     CDL QUEST       │   │    CDL EXCHANGE     │   │   FGN.BUSINESS  │ │
│  │                     │   │                     │   │                 │ │
│  │ Issues credentials  │   │ Verifies & displays │   │ Views aggregate │ │
│  │ for ATS training    │   │ CDL Passkey         │   │ workforce data  │ │
│  │ completion          │   │                     │   │                 │ │
│  └─────────────────────┘   └─────────────────────┘   └─────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Enhanced Skill Passport & Credential System (FGN.Academy)

### New Table: `authorized_apps`

Register external apps that can read/write credentials:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| app_name | text | Display name (CDL Quest, CDL Exchange) |
| app_slug | text | Unique identifier |
| api_key_hash | text | Hashed API key for authentication |
| allowed_origins | text[] | CORS allowed domains |
| can_read_credentials | boolean | Permission to read |
| can_issue_credentials | boolean | Permission to issue |
| credential_types_allowed | text[] | Which types app can issue |
| is_active | boolean | Enable/disable |
| created_at | timestamp | Registration time |

### New Table: `credential_types`

Define the types of credentials that can be issued:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type_key | text | Unique key (e.g., "cdl_basic", "cdl_advanced") |
| display_name | text | Human-readable name |
| description | text | What this credential represents |
| issuer_app_slug | text | Which app can issue this |
| game_title | game_title enum | Which SIM game (if applicable) |
| skills_granted | text[] | Skills this credential verifies |
| icon_name | text | Lucide icon |
| accent_color | text | Brand color |
| sort_order | integer | Display order |
| created_at | timestamp | Creation time |

### Enhanced `skill_credentials` Table

Add columns:

| Column | Type | Description |
|--------|------|-------------|
| issuer_app_slug | text | Which authorized app issued this |
| external_reference_id | text | ID in the issuing app's system |
| game_title | game_title enum | Which SIM game |
| credential_type_key | text | Reference to credential_types |

---

## Phase 2: Credential API Edge Function

Create `supabase/functions/credential-api/index.ts`:

### Endpoints

```text
PUBLIC ENDPOINTS (no auth required):
────────────────────────────────────
GET /passport/:slug
  → Returns public passport with credentials (if is_public=true)
  → Used by CDL Exchange to display user's CDL Passkey

POST /credentials/verify
  Body: { verification_hash: "..." }
  → Confirms credential is valid and not tampered
  → Used by employers to verify a candidate's credentials


AUTHENTICATED ENDPOINTS (user JWT required):
─────────────────────────────────────────────
GET /credentials/mine
  → Returns current user's credentials
  → Used by CDL Exchange to show user their CDL Passkey

POST /credentials/share
  Body: { credential_ids: [...], recipient_email: "..." }
  → Sends credential verification links to employer


AUTHORIZED APP ENDPOINTS (API key required):
────────────────────────────────────────────
GET /credentials/user/:email
  Headers: X-App-Key: xxx
  → Returns credentials for a user (authorized apps only)
  → Used by CDL Exchange to display passkey

POST /credentials/issue
  Headers: X-App-Key: xxx
  Body: { 
    user_email: "...",
    credential_type_key: "cdl_basic",
    score: 85,
    skills_verified: ["pre_trip_inspection", "backing_maneuvers"]
  }
  → CDL Quest issues credential when training completed
  → Credential appears in FGN.Academy Skill Passport AND CDL Exchange Passkey
```

### Security Model

```text
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: CORS                                                  │
│    • Only allowed_origins in authorized_apps table              │
│    • Blocks requests from unauthorized domains                  │
│                                                                  │
│  Layer 2: API Key Authentication                                │
│    • X-App-Key header verified against api_key_hash             │
│    • Each app has unique key with specific permissions          │
│                                                                  │
│  Layer 3: Permission Scoping                                    │
│    • can_read_credentials / can_issue_credentials               │
│    • credential_types_allowed limits what can be issued         │
│                                                                  │
│  Layer 4: Credential Integrity                                  │
│    • verification_hash = SHA256(payload + secret)               │
│    • Tamper-evident: any change invalidates hash                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Training Catalog API (Extends Credential API)

Add endpoints for Work Order / Learning Path sharing:

```text
PUBLIC CATALOG ENDPOINTS:
─────────────────────────
GET /catalog/learning-paths
  Query: ?game=ATS&featured=true
  → Returns published learning paths

GET /catalog/work-orders
  Query: ?game=ATS&path_id=xxx
  → Returns active work orders

GET /catalog/skills-mapping
  Query: ?game=ATS
  → Returns skills taxonomy for a game
  → CDL Quest uses this to map their training to FGN.Academy skills
```

---

## Phase 4: Admin Dashboard Enhancements

### New Admin Tab: "Authorized Apps"

Manage which external apps can access credentials:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Authorized Apps                                          [+ Add] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  CDL Quest                                          [Active] ││
│  │  simu-cdl-path.lovable.app                                   ││
│  │                                                              ││
│  │  Permissions:                                                ││
│  │  ✓ Read credentials    ✓ Issue credentials                  ││
│  │  Types: cdl_basic, cdl_advanced, cdl_endorsement             ││
│  │                                                              ││
│  │  [Regenerate Key] [Edit] [Revoke]                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  CDL Exchange                                       [Active] ││
│  │  skill-truck-path.lovable.app                                ││
│  │                                                              ││
│  │  Permissions:                                                ││
│  │  ✓ Read credentials    ✗ Issue credentials                  ││
│  │                                                              ││
│  │  [Regenerate Key] [Edit] [Revoke]                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### New Admin Tab: "Credential Types"

Define what credentials can be issued:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Credential Types                                         [+ Add] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ─── American Truck Simulator ────────────────────────────────── │
│                                                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ CDL Basic        │ │ CDL Advanced     │ │ Hazmat Endorse.  │ │
│  │ [🚛]             │ │ [🎯]             │ │ [⚠️]             │ │
│  │                  │ │                  │ │                  │ │
│  │ Issuer: CDL Quest│ │ Issuer: CDL Quest│ │ Issuer: CDL Quest│ │
│  │                  │ │                  │ │                  │ │
│  │ Skills:          │ │ Skills:          │ │ Skills:          │ │
│  │ • Pre-trip       │ │ • All basic +    │ │ • All advanced + │ │
│  │ • Basic driving  │ │ • Backing        │ │ • Hazmat regs    │ │
│  │ • Parking        │ │ • Night driving  │ │ • Placarding     │ │
│  │                  │ │ • Mountain routes│ │                  │ │
│  │ [Edit] [Delete]  │ │ [Edit] [Delete]  │ │ [Edit] [Delete]  │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
│ ─── Farming Simulator ───────────────────────────────────────── │
│                                                                  │
│  No credential types defined. Click Add to create one.          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: CDL Passkey ↔ Skill Passport Mapping

The **CDL Passkey** in CDL Exchange is a filtered view of the **Skill Passport** showing only CDL-related credentials:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DATA RELATIONSHIP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   FGN.ACADEMY                              CDL EXCHANGE          │
│   Skill Passport                           CDL Passkey           │
│   ─────────────                            ──────────            │
│                                                                  │
│   ┌───────────────────────┐                                      │
│   │ All Credentials       │                                      │
│   │                       │                                      │
│   │  ├─ ATS Credentials ──┼────────────────► ┌────────────────┐ │
│   │  │   • CDL Basic      │    game=ATS      │ CDL Passkey    │ │
│   │  │   • CDL Advanced   │    filter        │                │ │
│   │  │   • Hazmat         │                  │ Shows same     │ │
│   │  │                    │                  │ credentials    │ │
│   │  ├─ Farming Creds     │                  │ filtered to    │ │
│   │  │   • Harvester Op   │                  │ ATS/CDL only   │ │
│   │  │   • Planting       │                  │                │ │
│   │  │                    │                  │                │ │
│   │  └─ Construction      │                  │                │ │
│   │      • Excavator      │                  │                │ │
│   │      • Crane          │                  │                │ │
│   │                       │                  │                │ │
│   └───────────────────────┘                  └────────────────┘ │
│                                                                  │
│   Same data, different views based on context                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create (FGN.Academy)

| File | Purpose |
|------|---------|
| `supabase/functions/credential-api/index.ts` | Credential interchange API |
| `src/components/admin/AuthorizedAppsManager.tsx` | Manage external apps |
| `src/components/admin/AuthorizedAppEditDialog.tsx` | Add/Edit app dialog |
| `src/components/admin/CredentialTypesManager.tsx` | Manage credential types |
| `src/components/admin/CredentialTypeEditDialog.tsx` | Add/Edit type dialog |
| `src/hooks/useAuthorizedApps.ts` | Data fetching for apps |
| `src/hooks/useCredentialTypes.ts` | Data fetching for types |

## Files to Modify (FGN.Academy)

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Add "Authorized Apps" and "Credential Types" tabs |
| `src/pages/Profile.tsx` | Show credentials by game/issuer |
| `src/hooks/useProfile.ts` | Add game filtering for credentials |

## Database Migrations

1. Create `authorized_apps` table with RLS
2. Create `credential_types` table with RLS
3. Enhance `skill_credentials` with new columns
4. Create API key generation functions

---

## Implementation Benefits

| Benefit | How It's Achieved |
|---------|-------------------|
| **Single Source of Truth** | Credentials live in FGN.Academy database only |
| **Sites Stay Independent** | Each site has its own codebase, UI, community |
| **Selective Data Sharing** | Credential API shares only what's needed |
| **CDL Passkey = Skill Passport (filtered)** | Same data, ATS-only view |
| **Employer Verification** | Public API with hash verification |
| **Future Expansion** | Add new games/credential types via Admin |
| **B2B Integration Ready** | FGN.business can query aggregate data |

---

## Consumer Site Updates (Separate Projects)

After implementing the API, update CDL Quest and CDL Exchange:

**CDL Quest** (separate Lovable project):
- Add API client to call FGN.Academy credential-api
- When user completes training → POST /credentials/issue
- Display user's earned CDL credentials from API

**CDL Exchange** (separate Lovable project):
- Add API client to call FGN.Academy credential-api
- "CDL Passkey" page → GET /credentials/user/:email (filtered to ATS)
- Employer verification → POST /credentials/verify

---

## SSO Consideration

Given the business architecture, **full SSO may not be needed**. Users might:
- Have separate accounts on FGN.gg (casual gaming) vs FGN.Academy (training)
- Share credentials via public links rather than automatic account linking

However, if SSO is desired for CDL Quest ↔ FGN.Academy ↔ CDL Exchange, we can implement the redirect-based SSO from the previous plan as a future phase.

---

## Implementation Order

1. Create `authorized_apps` and `credential_types` tables
2. Enhance `skill_credentials` table
3. Build `credential-api` edge function
4. Create AuthorizedAppsManager admin component
5. Create CredentialTypesManager admin component
6. Add new tabs to Admin page
7. Test API endpoints
8. (Separate projects) Update CDL Quest and CDL Exchange to consume API

