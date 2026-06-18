## Why it keeps popping up

`src/components/layout/AppLayout.tsx` renders `<TenantSetupGate />` on every authenticated page. The gate (`src/components/TenantSetupGate.tsx`) auto-opens the `CommunitySetupWizard` whenever **all** of the following are true:

1. The active tenant has no `setup_completed_at` timestamp.
2. You have admin rights on that tenant (tenant admin or platform/super_admin).
3. You haven't dismissed it **in this browser session** (the dismiss key lives in `sessionStorage`, scoped per tenant — `fgn.setupGateDismissed:<tenantId>`).

So it pops up every new tab/window/session reload, and every time you switch to another admin-managed tenant whose `setup_completed_at` is null. Since you're a super_admin, you trip condition 2 on every tenant — including FGN Global, which likely never had setup completed.

It is "the default landing experience" by design: it's tied to AppLayout, not to a specific route.

## Options

Pick one and I'll implement:

**A. Remember dismissal permanently (per tenant, per user).**
Move the dismissal flag from `sessionStorage` to a row in the DB (e.g. `user_setup_gate_dismissals` keyed by `user_id + tenant_id`), or to `localStorage` as a lighter fix. Wizard still reachable from `/admin/community-setup`. Lowest-risk fix for your immediate annoyance.

**B. Mark the affected tenant(s) setup-complete.**
One-shot data fix: set `tenants.setup_completed_at = now()` for FGN Global (and any other tenant that's effectively already configured). Stops the gate cold for those tenants without touching code. Best if setup really is done and the flag was just never stamped.

**C. Suppress the gate for super_admins.**
Change `canManage` in `TenantSetupGate` to `isTenantAdmin` only (exclude `isPlatformAdmin`). Super_admins won't be nagged when impersonating/visiting other tenants; tenant-scoped admins still get the prompt. Pairs well with B.

**D. Remove the auto-open entirely.**
Drop `<TenantSetupGate />` from `AppLayout`. Setup is then only reachable from `/admin/community-setup` (already routed in `App.tsx`) or wherever you add a CTA. Cleanest if you don't want any auto-prompt.

## Recommendation

**B + C together**: stamp `setup_completed_at` on tenants that are already configured (kills today's pop-up) and stop nagging super_admins on tenants they don't own (kills tomorrow's). Keeps the gate working as intended for new tenant admins on fresh tenants.

If you'd rather not touch data, **A** (localStorage dismissal) is the smallest code-only change.

Tell me which option (or combo) to ship.
