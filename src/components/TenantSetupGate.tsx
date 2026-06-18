import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantAdminGuard } from '@/hooks/useTenantAdminGuard';
import { CommunitySetupWizard } from '@/components/admin/setup/CommunitySetupWizard';

/**
 * Auto-launches the Community Setup wizard for tenant admins whose
 * active tenant has not completed setup. Dismissals are remembered for
 * the session (per tenant) so the dialog doesn't reopen on every nav.
 */
export function TenantSetupGate() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { isTenantAdmin, isLoading: roleLoading } = useTenantAdminGuard();
  const [open, setOpen] = useState(false);

  const tenantId = tenant?.id ?? null;
  const completed = !!tenant?.setup_completed_at;
  // Only auto-open for tenant-scoped admins/owners. Super_admins and
  // platform-level admins are excluded so they aren't nagged when visiting
  // tenants they don't actually own. They can still reach the wizard via
  // /admin/community-setup.
  const canManage = isTenantAdmin;

  useEffect(() => {
    if (tenantLoading || roleLoading) return;
    if (!tenantId || !canManage || completed) return;
    const key = `fgn.setupGateDismissed:${tenantId}`;
    // Persist dismissals across sessions, not just the current tab.
    if (localStorage.getItem(key) === '1') return;
    setOpen(true);
  }, [tenantId, canManage, completed, tenantLoading, roleLoading]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && tenantId) {
      localStorage.setItem(`fgn.setupGateDismissed:${tenantId}`, '1');
    }
  };

  if (!canManage || !tenantId) return null;
  return <CommunitySetupWizard open={open} onOpenChange={handleOpenChange} />;
}
