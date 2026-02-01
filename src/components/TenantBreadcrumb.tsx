import { Link } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Building2, Home } from 'lucide-react';
import type { Tenant } from '@/types/tenant';

interface TenantBreadcrumbProps {
  /** The current tenant being viewed (if different from context tenant) */
  currentTenant?: Tenant | null;
  /** Whether to show the home link */
  showHome?: boolean;
  /** Custom class name */
  className?: string;
}

export function TenantBreadcrumb({ 
  currentTenant, 
  showHome = true,
  className 
}: TenantBreadcrumbProps) {
  const { tenant: contextTenant, tenants } = useTenant();
  
  // Use provided tenant or fall back to context tenant
  const activeTenant = currentTenant || contextTenant;
  
  if (!activeTenant) return null;

  // Build ancestor chain from the active tenant
  const getAncestorsForTenant = (tenant: Tenant): Tenant[] => {
    const ancestors: Tenant[] = [];
    let current = tenant;
    
    while (current.parent_tenant_id) {
      const parent = tenants.find(t => t.id === current.parent_tenant_id);
      if (parent) {
        ancestors.unshift(parent); // Add to beginning to maintain order
        current = parent;
      } else {
        break;
      }
    }
    
    return ancestors;
  };

  const ancestors = getAncestorsForTenant(activeTenant);
  
  // If no ancestors and not showing home, nothing to display
  if (ancestors.length === 0 && !showHome) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {showHome && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/communities" className="flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5" />
                  <span>Communities</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {(ancestors.length > 0 || activeTenant) && <BreadcrumbSeparator />}
          </>
        )}
        
        {ancestors.map((ancestor, index) => (
          <BreadcrumbItem key={ancestor.id}>
            <BreadcrumbLink asChild>
              <Link 
                to={`/communities/${ancestor.slug}`}
                className="flex items-center gap-1.5"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: ancestor.brand_color }}
                />
                <span>{ancestor.name}</span>
              </Link>
            </BreadcrumbLink>
            {(index < ancestors.length - 1 || activeTenant) && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
        
        <BreadcrumbItem>
          <BreadcrumbPage className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: activeTenant.brand_color }}
            />
            <span>{activeTenant.name}</span>
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
