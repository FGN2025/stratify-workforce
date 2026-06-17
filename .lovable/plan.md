# Multi-Tenancy Hardening — Revised for Curation Model

## Model correction from your guidance

The original plan treated `work_orders.tenant_id` as **ownership** (FGN owns row X, COX owns row Y). Your clarification changes this fundamentally:

- **Work orders are a shared global catalog.** FGN authors them once.
- **Tenants curate** which catalog items their members see (COX picks fiber-tech, skips house-flipper).
- **Unaffiliated users** (no `community_memberships` row) see the **entire catalog**, filterable.
- **Tenant members** see only their tenant's curated subset.
- Tenants *may* also author **tenant-exclusive** work orders (COX-internal training) — these are private to COX and never appear in the global catalog.

This requires a different data shape than the old plan. Below is the rewrite. Same 5-PR split; PR 1 and PR 4 change substantially.

---

## PR 1 — Curation Model + Visibility (replaces old "Runtime Isolation")

**Schema additions**
- New column `work_orders.visibility text not null default 'public'` — values `public` (global catalog) | `tenant_private` (COX-exclusive).
- New column `work_orders.owner_tenant_id uuid references tenants(id)` — author tenant (FGN for the global catalog, COX for tenant-private items). Replaces the overloaded `tenant_id` (kept as alias for compat, deprecated).
- New table `tenant_work_order_curation`:
  ```
  tenant_id uuid, work_order_id uuid, included boolean default true,
  added_by uuid, added_at timestamptz, primary key (tenant_id, work_order_id)
  ```
  Presence of any row(s) for a tenant = "curated mode" (allow-list). Absence of rows = "show all public" default (new tenants don't break).
- New SECURITY DEFINER fn `public.current_tenant_id()` reading `user_active_tenant` (also new: `user_id pk, tenant_id, updated_at`).
- New SECURITY DEFINER fn `public.is_work_order_visible(p_user uuid, p_wo uuid)` encoding the rules below.

**Visibility rules (the single source of truth)**

```text
visible_to(user, wo) :=
  -- Anonymous / unaffiliated user (no memberships, no active tenant)
  (no active tenant for user) AND wo.visibility = 'public'
  OR
  -- Tenant member, tenant has a curation list
  active_tenant = T AND wo.visibility = 'public' AND EXISTS curation(T, wo, included=true)
  OR
  -- Tenant member, tenant has NO curation rows yet (default = full catalog)
  active_tenant = T AND wo.visibility = 'public' AND NOT EXISTS any curation(T, *)
  OR
  -- Tenant-private item, viewed by member of owning tenant (or descendant)
  wo.visibility = 'tenant_private'
    AND (wo.owner_tenant_id = active_tenant
         OR wo.owner_tenant_id IN (SELECT get_parent_tenants(active_tenant)))
  OR
  -- super_admin always
  has_role(user, 'super_admin')
```

**RLS rewrite on `work_orders`, `events`, `courses`**
- SELECT: `USING (is_work_order_visible(auth.uid(), id))` (and equivalents for events/courses).
- INSERT/UPDATE/DELETE: `USING (has_tenant_role(auth.uid(), owner_tenant_id, 'admin') OR has_role(auth.uid(),'super_admin'))`.
- Drop the existing `USING (true)` SELECT policy.

**Admin UI**
- New `CurationManager` under `/admin/curation` (tenant admins only): lists global public catalog, toggle each work order in/out of `tenant_work_order_curation` for their active tenant. Switch between "Show all by default" (no rows) vs "Curated allow-list" (rows present).
- `useTenantAdminGuard()` hook gates this on `has_tenant_role(uid, active_tenant, 'admin')`.

**Client cleanup**
- Remove client-side `.filter(wo => wo.tenant_id === ...)` from `useWorkOrders`, `useEvents`, `useCourses`, `ActiveWorkOrders`. RLS does it now.
- Anonymous browse path (`/work-orders` for logged-out users): unchanged URL, but query now returns all `public` rows because `current_tenant_id()` is null and the visibility fn allows it.

**Verification**
1. Seed: COX tenant exists, COX has curation rows for 5 fiber-tech work orders. User U is COX member with `active_tenant = COX`. `GET /rest/v1/work_orders` returns exactly those 5.
2. Log out U. Hit `/work-orders`. Returns full global public catalog (~all FGN work orders).
3. Tenant Y with zero curation rows: member sees full public catalog (graceful default for new tenants).
4. Insert tenant-private WO owned by COX. Visible to COX member; invisible to FGN-only user; invisible to logged-out user.
5. COX admin removes a curation row in `/admin/curation` → that WO disappears from COX member's `/work-orders` after refetch.
6. `super_admin` sees everything everywhere.
7. WO-3120 detail page + Generate Name regression still works.

---

## PR 2 — tenant_id Backfill on Sensitive Tables (unchanged from prior plan)

Curation model doesn't change user-private data isolation. Still: add `tenant_id` to `telemetry_sessions`, `skill_credentials`, `work_order_evidence`, `simulations`, `tutor_conversations`, `webhook_subscriptions`, `ai_model_configs`, `career_path_requirements`, `authorized_apps`. RLS via `current_tenant_id()` + `has_role(super_admin)`. Backfill from joined parent row or user's first membership.

**Verification:** zero NULLs post-backfill; cross-tenant probe returns empty; new inserts from tenant-A stamp `tenant_id=A`.

---

## PR 3 — Hierarchy Inheritance (mostly unchanged; one curation tweak)

- `has_tenant_role_inherited()` for write paths (parent admin can edit child tenant rows).
- `get_accessible_tenants()` for admin pickers.
- **Curation inheritance:** `is_work_order_visible` checks curation at the active tenant only, **not** parents — explicitly. Rationale: a parent org curating doesn't auto-curate for every sub-community; each tenant picks its own catalog. Documented in the function comment so it doesn't get "fixed" later.

**Verification:** parent admin edits child tenant's WO → 200; child curation rows do not bleed up to parent's members.

---

## PR 4 — URL Routing + Branding Depth (expanded for white-label)

This is the "COX-branded fgn.academy" PR. Bigger than the prior version because branding depth is the whole point.

**Routing**
- `/t/:tenantSlug/*` route prefix; subdomain (`cox.fgn.academy`) still primary; URL slug = shareable form + hard-refresh persistence.
- `TenantSwitcher` updates URL on change.

**Branding columns on `tenants`**
- `logo_url`, `logo_dark_url`, `favicon_url`, `og_image_url`
- `accent_color` (secondary, beyond existing `brand_color`)
- `font_heading`, `font_body` (CSS font-family strings)
- `nav_app_name` (e.g. "COX Skills" vs "FGN Academy")
- `support_email`, `terms_url`, `privacy_url`
- `tagline` (hero subtitle)
- `scorm_destinations jsonb` — per-tenant SCORM brand tokens

**TenantContext**
- Inject `--primary`, `--accent`, font CSS vars on tenant resolve.
- Set `<title>`, favicon `<link>`, OG meta from tenant.
- Replace hardcoded "FGN Academy" in `TopNav` / sidebar / hero with `tenant.nav_app_name`.

**SCORM**
- `supabase/functions/scorm-build/_lib/brand-tokens.ts` reads `tenants.scorm_destinations` for the owning tenant, falls back to FGN defaults.

**Verification**
1. `cox.fgn.academy` (or `/t/cox/`) → COX logo, COX color, "COX Skills" in nav, COX favicon, COX OG card, COX support email in footer.
2. Hard refresh preserves all branding.
3. SCORM bundle built under COX active tenant → manifest references COX URLs.
4. FGN tenants visually unchanged (regression snapshot).

---

## PR 5 — Remove FGN Hardcodes (unchanged)

- `super_admin_bootstrap` table replaces `darcy@fgn.gg` literal in `handle_admin_user` trigger.
- `tenants.is_platform_default boolean` replaces `slug === 'fgn'` fallback in `TenantContext`.
- `rg "fgn"` in `src/` returns only data references, no logic branches.

**Verification:** new bootstrap email gets `super_admin` on signup with no code change; flipping `is_platform_default` redirects unknown-subdomain fallback.

---

## Open questions before build

These weren't fully answered by your message and affect PR 1's shape:

1. **Curation default for brand-new tenants** — empty curation list = "see full public catalog" (proposed above, friendliest) OR "see nothing until admin curates" (strictest)?
2. **Events & Courses** — apply the same curation model (`tenant_event_curation`, `tenant_course_curation`)? Or only `work_orders` for now?
3. **Anonymous users** — should they be allowed to see tenant-private items shared via direct link (off by default, on with a `share_token`)? Or hard no, tenant-private is always tenant-gated?
4. **Curation override per user-role** — can a COX `instructor` see items COX admin hasn't curated yet (for evaluation)? Or strictly the curated allow-list for every COX role except `super_admin`?

If you confirm defaults (1=permissive, 2=work_orders only first, 3=hard no, 4=strict allow-list) I'll lock the plan and we move to PR 1 build.

---

## Rollout

| Order | PR | Risk | Sprint |
|---|---|---|---|
| 1 | PR 1 — Curation + Visibility | **High** | 1.0 |
| 2 | PR 2 — tenant_id Backfill | Medium | 1.0 |
| 3 | PR 3 — Hierarchy | Low | 0.5 |
| 4 | PR 4 — Routing + Branding (white-label) | Medium | 1.0–1.5 |
| 5 | PR 5 — FGN Hardcodes | Low | 0.5 |

Total ~4–4.5 sprints. PR 1 ships behind a feature flag (`tenant_curation_enforced`) so a leak or bad curation row can be reverted to the current "show all" behavior in one toggle.
