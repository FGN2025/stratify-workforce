import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Handles `/t/:tenantSlug/*` URLs:
 *  - Activates the matching tenant in TenantContext.
 *  - Strips the `/t/:tenantSlug` prefix and redirects to the underlying app route
 *    so the rest of the router tree renders normally.
 *
 * If the slug doesn't match any tenant, falls back to root.
 */
export function TenantRouteRedirect() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenants, setTenantBySlug, isLoading } = useTenant();
  const location = useLocation();

  useEffect(() => {
    if (tenantSlug) setTenantBySlug(tenantSlug);
  }, [tenantSlug, setTenantBySlug]);

  if (isLoading) return null;

  const exists = !!tenants.find((t) => t.slug === tenantSlug);
  // Strip `/t/<slug>` from the front
  const stripped = location.pathname.replace(/^\/t\/[^/]+/, '') || '/';
  const target = exists ? stripped + location.search + location.hash : '/';
  return <Navigate to={target} replace />;
}
