import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tenant } from '@/types/tenant';

interface TenantHierarchyResult {
  tenants: Tenant[];
  rootTenants: Tenant[];
  tenantsById: Map<string, Tenant>;
  isLoading: boolean;
  error: string | null;
  getChildren: (tenantId: string) => Tenant[];
  getParent: (tenantId: string) => Tenant | null;
  getAncestors: (tenantId: string) => Tenant[];
  getDescendants: (tenantId: string) => Tenant[];
  buildTree: () => Tenant[];
  refetch: () => Promise<void>;
}

export function useTenantHierarchy(): TenantHierarchyResult {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('tenants')
      .select('*')
      .order('hierarchy_level', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    setTenants((data || []) as unknown as Tenant[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Create a map for O(1) lookup
  const tenantsById = new Map<string, Tenant>(
    tenants.map(t => [t.id, t])
  );

  // Get root tenants (no parent)
  const rootTenants = tenants.filter(t => !t.parent_tenant_id);

  // Get direct children of a tenant
  const getChildren = useCallback((tenantId: string): Tenant[] => {
    return tenants.filter(t => t.parent_tenant_id === tenantId);
  }, [tenants]);

  // Get parent of a tenant
  const getParent = useCallback((tenantId: string): Tenant | null => {
    const tenant = tenantsById.get(tenantId);
    if (!tenant?.parent_tenant_id) return null;
    return tenantsById.get(tenant.parent_tenant_id) || null;
  }, [tenantsById]);

  // Get all ancestors (parent chain) of a tenant
  const getAncestors = useCallback((tenantId: string): Tenant[] => {
    const ancestors: Tenant[] = [];
    let current = tenantsById.get(tenantId);
    
    while (current?.parent_tenant_id) {
      const parent = tenantsById.get(current.parent_tenant_id);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return ancestors;
  }, [tenantsById]);

  // Get all descendants (children, grandchildren, etc.) of a tenant
  const getDescendants = useCallback((tenantId: string): Tenant[] => {
    const descendants: Tenant[] = [];
    const queue = getChildren(tenantId);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.push(current);
      queue.push(...getChildren(current.id));
    }
    
    return descendants;
  }, [getChildren]);

  // Build a tree structure with nested children
  const buildTree = useCallback((): Tenant[] => {
    const tenantsCopy = tenants.map(t => ({ ...t, children: [] as Tenant[] }));
    const byId = new Map(tenantsCopy.map(t => [t.id, t]));
    const roots: Tenant[] = [];

    for (const tenant of tenantsCopy) {
      if (tenant.parent_tenant_id) {
        const parent = byId.get(tenant.parent_tenant_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(tenant);
        }
      } else {
        roots.push(tenant);
      }
    }

    return roots;
  }, [tenants]);

  return {
    tenants,
    rootTenants,
    tenantsById,
    isLoading,
    error,
    getChildren,
    getParent,
    getAncestors,
    getDescendants,
    buildTree,
    refetch: fetchTenants,
  };
}
