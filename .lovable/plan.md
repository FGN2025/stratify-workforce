## Community Setup Wizard

A guided, multi-step wizard that lets a community admin (e.g. COX) configure their tenant: identity & branding, corporate info, industries, and which challenges / work orders / events / courses to surface to their members. FGN remains the super-tenant catalog; every other tenant curates from it.

### User-visible flow

Entry points:
- Auto-launch on first visit to `/t/:slug` (or `/admin`) when the admin's active tenant has `setup_completed_at IS NULL`.
- Manual re-open from **Admin → Community Setup** ("Edit setup" button).

Wizard steps (single dialog, step indicator at top, Back/Next/Save Draft/Finish):

1. **Identity & Branding** — name, slug, description, logo, cover image, brand color. Reuses fields already on `tenants`.
2. **Corporate Info** — legal name, DBA, primary contact name, primary contact email, primary contact phone, HQ address (street, city, state, zip, country), public website.
3. **Industries** — multi-select from a fixed seeded list (Broadband, Construction, Oil & Gas, Trucking, Agriculture, Manufacturing, Utilities, Energy, Telecom, Logistics, Public Sector, Education, Other). One required.
4. **Catalog Curation** — pick which Work Orders, Challenges, Events, and Courses from the FGN super-catalog appear for this tenant's members. Embeds the existing `CurationManager` UI in tabs, scoped to the active tenant. Empty selection = nothing shown (matches current RLS behavior post-PR4).
5. **Review & Finish** — summary card; Finish stamps `setup_completed_at = now()`.

### Database (one migration)

New columns on `public.tenants` (all nullable except where noted):
- `legal_name text`, `dba text`
- `primary_contact_name text`, `primary_contact_email text`, `primary_contact_phone text`
- `hq_street text`, `hq_city text`, `hq_state text`, `hq_zip text`, `hq_country text`
- `industries text[] not null default '{}'`
- `setup_completed_at timestamptz`
- `setup_step smallint not null default 0` — last step the admin reached, for resume

No new tables — curation already lives in `tenant_work_order_curation`, `tenant_event_curation`, `tenant_course_curation`. No RLS changes (existing tenant-admin update policy on `tenants` covers the new columns).

### Frontend

New files:
- `src/components/admin/setup/CommunitySetupWizard.tsx` — dialog shell, step state, persists `setup_step` on Next, stamps `setup_completed_at` on Finish.
- `src/components/admin/setup/steps/IdentityStep.tsx` — wraps existing identity/branding fields from `CommunityFormDialog`.
- `src/components/admin/setup/steps/CorporateStep.tsx` — new form for legal/contact/HQ.
- `src/components/admin/setup/steps/IndustriesStep.tsx` — checkbox grid against `INDUSTRY_OPTIONS` constant.
- `src/components/admin/setup/steps/CatalogStep.tsx` — tabbed wrapper around `CurationManager` (Work Orders / Challenges / Events / Courses) scoped to active tenant.
- `src/components/admin/setup/steps/ReviewStep.tsx` — summary + Finish.
- `src/constants/industries.ts` — `INDUSTRY_OPTIONS` array.
- `src/hooks/useCommunitySetup.ts` — fetch + mutate tenant setup state with React Query.
- `src/pages/admin/CommunitySetup.tsx` — Admin route that mounts the wizard (also linked from sidebar Admin section).

Edits:
- `src/App.tsx` — add `/admin/community-setup` route.
- `src/components/layout/AppSidebar.tsx` — add "Community Setup" item under Admin for tenant admins.
- `src/contexts/TenantContext.tsx` — expose `setupCompletedAt` on the active tenant so the auto-launcher can check it.
- New `src/components/TenantSetupGate.tsx` — mounted near the tenant layout; opens the wizard automatically when admin + setup incomplete.
- `src/types/tenant.ts` — extend `Tenant` type with the new columns.

### Out of scope (backlog)
- FGN-parent enforcement rule (deferred per user).
- Profile/social fields, compliance/certifications, company size & founded year.
- Free-tag custom industries; mapping industries to `sim_categories`.
- Bulk import of work orders or templated starter catalogs per industry.
- Email/Slack notifications when setup is completed.

### Verification
- As a tenant admin on COX, visiting `/t/cox` with `setup_completed_at IS NULL` auto-opens the wizard.
- Each step saves and resumes correctly (refresh mid-wizard returns to the same step).
- Selecting work orders in step 4 immediately filters the COX home carousels; deselecting hides them; FGN super-admin still sees everything.
- A second tenant (e.g. the seeded sibling) shows its own independent curation.
- Finishing the wizard stamps `setup_completed_at` and stops the auto-launch on subsequent visits.
