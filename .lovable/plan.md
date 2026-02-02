

# Plan: Integrate ATS Subsites (CDL Quest & CDL Exchange)

## Overview

You have two specialized American Truck Simulator sites that serve distinct purposes in the FGN ecosystem:

| Site | Purpose | Primary Audience |
|------|---------|------------------|
| **CDL Quest** (simu-cdl-path.lovable.app) | Training & Curriculum Engine | Students, CDL Schools |
| **CDL Exchange** (skill-truck-path.lovable.app) | Credential Marketplace & Job Pipeline | Employers, Recruiters |

These will be integrated as "deep-dive" subsites linked from FGN.Academy and FGN.Business, while remaining independently hosted and managed.

---

## Integration Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         FGN ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐                    ┌─────────────────┐        │
│  │  FGN.Academy    │                    │  FGN.Business   │        │
│  │  (Main Hub)     │                    │  (B2B Portal)   │        │
│  │                 │                    │                 │        │
│  │  • Competitions │                    │  • Recruitment  │        │
│  │  • Leaderboards │                    │  • Partnerships │        │
│  │  • Skill Tracks │                    │  • Analytics    │        │
│  └────────┬────────┘                    └────────┬────────┘        │
│           │                                      │                  │
│           │    ┌─────────────────────────────────┘                  │
│           │    │                                                    │
│           ▼    ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ATS SUBSITES                              │   │
│  │                                                              │   │
│  │  ┌─────────────────────┐    ┌──────────────────────┐        │   │
│  │  │    CDL Quest        │    │    CDL Exchange      │        │   │
│  │  │                     │    │                      │        │   │
│  │  │  • Training Paths   │    │  • CDL Passkey       │        │   │
│  │  │  • Module Library   │    │  • Candidate Pool    │        │   │
│  │  │  • School Portal    │    │  • Employer Portal   │        │   │
│  │  │  • Telemetry Lab    │    │  • Cross-border Jobs │        │   │
│  │  └─────────────────────┘    └──────────────────────┘        │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Changes to FGN.Academy

### 1. New Component: ExternalResourceCard
A reusable card component for linking to external subsites with consistent branding.

**Features:**
- External link icon indicator
- Opens in new tab with `rel="noopener noreferrer"`
- Branded accent color matching the subsite
- Description and CTA button

### 2. Update Work Orders Page
Add a new carousel section: **"Deep Dive: American Truck Simulator"** that appears when filtering by ATS or viewing ATS work orders.

**Links to display:**
- CDL Quest → "Explore CDL Training Paths"
- CDL Exchange → "Find CDL Opportunities"

### 3. Update Learn Page
Add an **"External Training Resources"** section for ATS-specific deep content.

**Link:**
- CDL Quest → "Access Full CDL Curriculum"

### 4. Update Profile/Skill Passport Page
Add a **"Credential Verification"** link for users with ATS achievements.

**Link:**
- CDL Exchange → "Verify on CDL Exchange" (for sharing with employers)

### 5. Footer Links
Add a dedicated **"ATS Resources"** section in the footer (if footer exists) or in the sidebar.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/marketplace/ExternalResourceCard.tsx` | Create | Reusable card for external subsite links |
| `src/pages/WorkOrders.tsx` | Modify | Add ATS deep-dive carousel section |
| `src/pages/Learn.tsx` | Modify | Add external training resources section |
| `src/pages/Profile.tsx` | Modify | Add credential verification link |
| `src/components/layout/AppSidebar.tsx` | Modify | Add ATS Resources expandable section |

---

## Implementation Details

### ExternalResourceCard Component

```text
Props:
- title: string (e.g., "CDL Quest")
- description: string
- href: string (external URL)
- accentColor: string (hex color)
- icon: ReactNode
- ctaLabel: string (e.g., "Explore Training")
```

### Work Orders Page Addition

A new carousel appears when:
1. User filters by "ATS" game type, OR
2. There are ATS work orders visible

Content:
```text
Title: "Deep Dive: American Truck Simulator"
Subtitle: "Extended training resources and career pathways"

Cards:
1. CDL Quest
   - "Structured Learning Paths"
   - "Complete CDL curriculum with telemetry tracking"
   - CTA: "Start Training →"
   - URL: https://simu-cdl-path.lovable.app

2. CDL Exchange  
   - "Career Marketplace"
   - "Verified credentials for employers and recruiters"
   - CTA: "View Opportunities →"
   - URL: https://skill-truck-path.lovable.app
```

### Sidebar Enhancement

Add a collapsible "ATS Resources" section under the main navigation with quick links to both subsites.

---

## Maintaining Separate Sites

### Recommended Domain Structure (Future)

For a professional ecosystem, consider:
- `cdl-quest.fgn.academy` → points to simu-cdl-path.lovable.app
- `cdl-exchange.fgn.academy` → points to skill-truck-path.lovable.app

This can be achieved via:
1. CNAME records pointing subdomains to Lovable apps
2. Or keeping `.lovable.app` URLs and using them directly

### Cross-Site Navigation

Each subsite should include:
- **Header link**: "← Back to FGN Academy" 
- **Footer links**: FGN.Academy, FGN.Business
- Consistent branding elements (logo, colors)

### Shared Authentication (Future Enhancement)

For seamless UX, consider implementing:
- SSO token passing between sites
- Or deep links with user context (e.g., `?from=academy&user=xxx`)

---

## Summary of Links

| From | To | Location in UI | Context |
|------|-----|----------------|---------|
| FGN.Academy | CDL Quest | Work Orders (ATS carousel) | "Start Training" |
| FGN.Academy | CDL Quest | Learn page | "Full CDL Curriculum" |
| FGN.Academy | CDL Exchange | Profile page | "Verify Credentials" |
| FGN.Academy | Both | Sidebar | "ATS Resources" section |
| FGN.Business | CDL Exchange | Recruitment section | "Candidate Pipeline" |
| Both Subsites | FGN.Academy | Header/Footer | "Back to Academy" |
| Both Subsites | FGN.Business | Footer | "For Employers" |

---

## Technical Notes

- All external links use `target="_blank"` with `rel="noopener noreferrer"` for security
- External links are clearly marked with an icon to set user expectations
- No backend changes required—this is purely frontend navigation integration
- The subsites remain independently deployed Lovable projects

