

# FGN.Academy Production Punchlist

## What We Have (Strengths)
- Credential API with issue/verify/catalog endpoints + OpenAPI spec
- Public Catalog API for cross-site content sharing
- Skill Passport profile with credentials, skill radar, achievements
- Leaderboard wired to real data with game filtering
- Work Orders with telemetry-based completion + evidence upload
- Multi-tenant community hierarchy with approval workflows
- Role-based access (super_admin, admin, moderator, developer, user)
- AI Tutor, Events/Tournaments, LMS courses, Media Library
- Developer Portal with interactive API docs

## What's Missing for Production & Partner Integration

### Priority 1: Skill Passport Shareability (Critical for DOL/TIRAP/Partners)

| # | Item | Description |
|---|------|-------------|
| 1.1 | **Passport PDF Export** | "Export PDF" button exists but does nothing. Generate a branded PDF with QR verification code, credential list, skill radar chart, and employability score — the artifact DOL/TIRAP reviewers will actually see. |
| 1.2 | **Public Passport Page** | The API endpoint `GET /passport/:slug` exists, but there's no public-facing web page to render it. Build a standalone `/passport/:slug` route (no auth required) that renders credentials beautifully for employers/reviewers. |
| 1.3 | **Passport Share Flow** | The "Share" button on Profile is a no-op. Implement: generate/toggle public slug, copy shareable URL, optional QR code generation. |
| 1.4 | **Passport Embed Widget** | A lightweight `<iframe>` or JS embed snippet that partners (broadbandworkforce.com, simu-cdl-path, skill-truck-path) can drop into their sites to display a user's verified credentials. |

### Priority 2: Partner API Enhancements

| # | Item | Description |
|---|------|-------------|
| 2.1 | **Credential API: Bulk Query** | Partners like broadbandworkforce.com will need to query credentials for multiple users at once. Add `POST /credentials/batch` endpoint. |
| 2.2 | **Credential API: Webhook Notifications** | When a credential is issued, notify subscribed partner apps (simu-cdl-path, skill-truck-path) via webhook so they can update their UIs in real-time. |
| 2.3 | **Credential API: Career Path Mapping** | Add an endpoint that maps credentials to career paths (CDL Class A, Fiber Technician, Heavy Equipment Operator). This is what TIRAP/DOL will use to evaluate apprenticeship readiness. |
| 2.4 | **Fiber_Tech in Public Catalog** | The `public-catalog` edge function doesn't include Fiber_Tech in its GAME_CONFIG. Broadbandworkforce.com needs this. |
| 2.5 | **API Rate Limiting** | No rate limiting on credential API endpoints. Required before partner traffic scales. |

### Priority 3: User Experience Gaps

| # | Item | Description |
|---|------|-------------|
| 3.1 | **Forgot Password Flow** | No "Forgot Password" link on the Auth page. Users locked out have no self-service recovery. |
| 3.2 | **Skill Radar: Real Data** | Skill radar uses hardcoded `defaultSkills` (all 50) and `tenantAverage`. Wire to actual `skills_taxonomy` and `skill_credentials` data. |
| 3.3 | **Profile: Game Filter** | Profile shows all credentials in one list. Add game-specific filtering like the leaderboard already has. |
| 3.4 | **Onboarding: Career Interest Selection** | During signup, let users indicate career interests (trucking, agriculture, construction, fiber/broadband). This feeds into personalized Work Order recommendations and partner matching. |
| 3.5 | **Notification System** | No in-app notifications. Students don't know when credentials are issued, work orders are graded, or community requests are approved. |

### Priority 4: Apprenticeship & Career Readiness

| # | Item | Description |
|---|------|-------------|
| 4.1 | **Career Paths Page** | A new `/careers` page showing available apprenticeship pathways mapped to simulation tracks. Links to apprenticeship.gov and TIRAP resources. Shows which credentials are required/recommended. |
| 4.2 | **Apprenticeship Readiness Score** | Extend the employability score concept into a per-career-path readiness percentage. "You're 72% ready for CDL Class A apprenticeship." |
| 4.3 | **Employer Verification Portal** | A lightweight public page where employers paste a verification hash or scan a QR code and get a formatted credential report. Currently only an API endpoint exists. |
| 4.4 | **Partner Directory** | A page listing connected partner organizations (TIRAP, DOL, broadband providers, trucking companies) with links and descriptions of how credentials flow between systems. |

### Priority 5: Data & Analytics

| # | Item | Description |
|---|------|-------------|
| 5.1 | **Admin Analytics Dashboard** | Admin stats grid exists but uses basic counts. Add trends, completion rates, credential issuance velocity, and partner API usage. |
| 5.2 | **Student Progress Timeline** | A chronological view of a student's journey: signup → first sim → work orders completed → credentials earned → career path progress. |
| 5.3 | **Audit Trail for Credentials** | Log every credential issuance, verification attempt, and share event. Critical for DOL compliance. |

## Recommended Implementation Order

**Phase 1 — Partner-Ready Passport** (Items 1.1–1.4, 2.4, 3.1)
Get the Skill Passport exportable, shareable, and embeddable. Fix Fiber_Tech gap. Add forgot password. This unblocks all three partner sites and DOL/TIRAP demos.

**Phase 2 — Career Mapping** (Items 4.1–4.3, 2.3)
Build the career paths page and readiness scoring. Add the employer verification portal. This is the "why it matters" layer for apprenticeship.gov and TIRAP.

**Phase 3 — Partner API Scale** (Items 2.1, 2.2, 2.5, 5.3)
Batch queries, webhooks, rate limiting, and audit logging. Required before real partner traffic.

**Phase 4 — UX Polish** (Items 3.2–3.5, 4.4, 5.1–5.2)
Real skill radar data, notifications, career interest onboarding, analytics dashboards.

## Files Affected (Phase 1 estimate)

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Wire Export PDF + Share buttons |
| New: `src/pages/PublicPassport.tsx` | Public passport viewer page |
| New: `src/pages/Careers.tsx` | Career paths page (Phase 2) |
| `src/App.tsx` | Add new routes |
| `src/pages/Auth.tsx` | Add forgot password link + flow |
| `supabase/functions/public-catalog/index.ts` | Add Fiber_Tech to GAME_CONFIG |
| `supabase/functions/credential-api/index.ts` | Add batch endpoint, career mapping |
| New: `supabase/functions/passport-pdf/index.ts` | Server-side PDF generation |

