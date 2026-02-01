import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tenant } from '@/types/tenant';

interface TenantContextType {
  tenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  setTenantBySlug: (slug: string) => void;
  setTenantById: (id: string) => void;
  getParentTenant: () => Tenant | null;
  getChildTenants: () => Tenant[];
  getAncestors: () => Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Convert hex to HSL for CSS variable injection
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '160 84% 39%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inject tenant color into CSS
  const injectTenantTheme = useCallback((color: string) => {
    const hsl = hexToHSL(color);
    document.documentElement.style.setProperty('--primary', hsl);
    document.documentElement.style.setProperty('--ring', hsl);
    document.documentElement.style.setProperty('--sidebar-primary', hsl);
    document.documentElement.style.setProperty('--sidebar-ring', hsl);
    document.documentElement.style.setProperty('--chart-1', hsl);
  }, []);

  // Load all tenants on mount
  useEffect(() => {
    async function loadTenants() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('hierarchy_level', { ascending: true })
        .order('name');
      
      if (error) {
        console.error('Error loading tenants:', error);
        setIsLoading(false);
        return;
      }

      // Type assertion since we know the shape matches
      const typedTenants = data as unknown as Tenant[];
      setTenants(typedTenants);

      // Check for subdomain first
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      const matchingTenant = typedTenants.find(t => t.slug === subdomain);

      if (matchingTenant) {
        setTenant(matchingTenant);
        injectTenantTheme(matchingTenant.brand_color);
      } else if (typedTenants.length > 0) {
        // Default to first tenant (FGN Global)
        const defaultTenant = typedTenants.find(t => t.slug === 'fgn') || typedTenants[0];
        setTenant(defaultTenant);
        injectTenantTheme(defaultTenant.brand_color);
      }

      setIsLoading(false);
    }

    loadTenants();
  }, [injectTenantTheme]);

  const setTenantBySlug = useCallback((slug: string) => {
    const newTenant = tenants.find(t => t.slug === slug);
    if (newTenant) {
      setTenant(newTenant);
      injectTenantTheme(newTenant.brand_color);
    }
  }, [tenants, injectTenantTheme]);

  const setTenantById = useCallback((id: string) => {
    const newTenant = tenants.find(t => t.id === id);
    if (newTenant) {
      setTenant(newTenant);
      injectTenantTheme(newTenant.brand_color);
    }
  }, [tenants, injectTenantTheme]);

  const getParentTenant = useCallback((): Tenant | null => {
    if (!tenant?.parent_tenant_id) return null;
    return tenants.find(t => t.id === tenant.parent_tenant_id) || null;
  }, [tenant, tenants]);

  const getChildTenants = useCallback((): Tenant[] => {
    if (!tenant) return [];
    return tenants.filter(t => t.parent_tenant_id === tenant.id);
  }, [tenant, tenants]);

  const getAncestors = useCallback((): Tenant[] => {
    if (!tenant) return [];
    const ancestors: Tenant[] = [];
    let current = tenant;
    
    while (current.parent_tenant_id) {
      const parent = tenants.find(t => t.id === current.parent_tenant_id);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return ancestors;
  }, [tenant, tenants]);

  return (
    <TenantContext.Provider value={{ 
      tenant, 
      tenants, 
      isLoading, 
      setTenantBySlug,
      setTenantById,
      getParentTenant,
      getChildTenants,
      getAncestors,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
