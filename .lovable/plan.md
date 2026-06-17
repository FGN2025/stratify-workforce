# Tenant-Curate the Home Page Carousels

## Problem
The home page (`/`) shows the same Trending Work Orders, Recently Added, and Popular This Week to every tenant. `src/pages/Index.tsx` queries `work_orders` directly with no tenant dependency and no curation awareness, so switching between FGN, Cox, and Oil & Gas shows identical lists.

Curation infrastructure from PR 1–3 (`tenant_work_order_curation`, `is_work_order_visible`, plus the `CurationManager` UI in Admin) is already wired into `useWorkOrders` via RLS, but the home page bypasses that hook.

Featured Communities should stay global (every tenant can discover the others at a basic level) — that part already pulls from `tenants` and is correct.

## Changes

### 1. `src/pages/Index.tsx` — use curation-aware data
- Replace the inline `supabase.from('work_orders')` fetch with `useWorkOrders('all')` so:
  - RLS `is_work_order_visible()` filters out items the current tenant has hidden via curation.
  - Query refetches on tenant switch (hook already keys on `tenant?.id`).
- Keep the Featured Communities query as-is (global list of approved tenants — intentional cross-tenant discovery surface).
- Derive each carousel from the same curated list:
  - **Trending** — first 6 by `created_at desc` (current behavior, now curated).
  - **Recently Added** — first 4 (curated).
  - **Popular This Week** — first 6 (curated; sort can be refined later when completion counts land).
- Loading state: use the hook's `isLoading` plus the existing communities fetch.

### 2. Empty-state copy
When a tenant has curated a small catalog (or zero items pass visibility), show the existing carousel empty message rather than a blank rail. Add a one-line hint for tenant admins: "No items yet — curate your catalog in Admin → Curation."

### 3. No DB / RLS changes
PR 1–3 already cover:
- `tenant_work_order_curation` permissive-default semantics.
- `is_work_order_visible(work_order_id, tenant_id)` RLS predicate.
- Admin `CurationManager` for picking included items.

So this is a frontend-only change.

## Out of scope
- Cross-tenant private sharing (explicit hard-no per prior decision).
- Curation inheritance from parent tenants (explicitly disabled in PR 3).
- New "Popular This Week" ranking signal — keeping current ordering until completion telemetry is aggregated.

## Verification
1. Open `/` as FGN — note the work orders listed.
2. Switch to Oil & Gas via the tenant switcher.
3. As an Oil & Gas admin, open Admin → Curation, enable curated mode, and toggle a couple work orders off.
4. Return to `/` — the toggled-off items disappear from Trending / Recent / Popular while Featured Communities still shows all three tenants.
5. Switch back to FGN — full catalog still visible (FGN remains permissive).

## Files touched
- `src/pages/Index.tsx` (only)
