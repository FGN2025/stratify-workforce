import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types/tenant';

interface TenantContextType {
  tenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  appName: string;
  setTenantBySlug: (slug: string) => void;
  setTenantById: (id: string) => void;
  getParentTenant: () => Tenant | null;
  getChildTenants: () => Tenant[];
  getAncestors: () => Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const ACTIVE_TENANT_STORAGE_KEY = 'fgn.activeTenantSlug';

function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '160 84% 39%';
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
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

function detectSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  // Path-based: /t/<slug>/...
  const pathMatch = window.location.pathname.match(/^\/t\/([^/]+)/i);
  if (pathMatch) return pathMatch[1].toLowerCase();
  // Subdomain-based: <slug>.fgn.academy
  const host = window.location.hostname;
  const parts = host.split('.');
  // Ignore localhost, lovable.app preview hosts, www, raw IPs
  if (parts.length >= 3 && !host.includes('lovable.app')) {
    const sub = parts[0].toLowerCase();
    if (sub && sub !== 'www' && sub !== 'fgn' && sub !== 'app') return sub;
  }
  return null;
}

function applyTenantBranding(t: Tenant) {
  const root = document.documentElement;
  const primaryHsl = hexToHSL(t.brand_color);
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--ring', primaryHsl);
  root.style.setProperty('--sidebar-primary', primaryHsl);
  root.style.setProperty('--sidebar-ring', primaryHsl);
  root.style.setProperty('--chart-1', primaryHsl);
  root.style.setProperty('--tenant-primary', primaryHsl);

  if (t.accent_color) {
    const accentHsl = hexToHSL(t.accent_color);
    root.style.setProperty('--accent', accentHsl);
    root.style.setProperty('--tenant-accent', accentHsl);
  } else {
    root.style.removeProperty('--tenant-accent');
  }

  if (t.font_heading) root.style.setProperty('--font-heading', t.font_heading);
  else root.style.removeProperty('--font-heading');
  if (t.font_body) root.style.setProperty('--font-body', t.font_body);
  else root.style.removeProperty('--font-body');

  // <title>
  const appName = t.nav_app_name || t.name || 'FGN Academy';
  if (t.tagline) document.title = `${appName} — ${t.tagline}`;
  else document.title = appName;

  // favicon
  if (t.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = t.favicon_url;
  }

  // og:image
  if (t.og_image_url) {
    const setMeta = (prop: string, content: string) => {
      let m = document.querySelector<HTMLMetaElement>(`meta[property='${prop}']`);
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('property', prop);
        document.head.appendChild(m);
      }
      m.content = content;
    };
    setMeta('og:image', t.og_image_url);
    setMeta('og:title', appName);
    if (t.tagline) setMeta('og:description', t.tagline);
  }
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const persistTimer = useRef<number | null>(null);

  // Load tenant catalog
  useEffect(() => {
    let cancelled = false;
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
      if (cancelled) return;
      const list = (data as unknown as Tenant[]) || [];
      setTenants(list);

      // Resolution priority: URL > saved (user_active_tenant or localStorage) > FGN default
      const urlSlug = detectSlugFromUrl();
      const localSlug = typeof window !== 'undefined'
        ? window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY)
        : null;

      let resolved: Tenant | undefined;

      if (urlSlug) resolved = list.find((t) => t.slug === urlSlug);

      if (!resolved && user) {
        // Read persisted active tenant for the user
        const { data: active } = await supabase
          .from('user_active_tenant')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (active?.tenant_id) {
          resolved = list.find((t) => t.id === active.tenant_id);
        }
      }

      if (!resolved && localSlug) resolved = list.find((t) => t.slug === localSlug);
      if (!resolved) resolved = list.find((t) => t.slug === 'fgn') || list[0];

      if (resolved) {
        setTenant(resolved);
        applyTenantBranding(resolved);
      }
      setIsLoading(false);
    }
    loadTenants();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Re-detect tenant when URL changes (popstate / pushState)
  useEffect(() => {
    function handleUrlChange() {
      const slug = detectSlugFromUrl();
      if (!slug || tenants.length === 0) return;
      const match = tenants.find((t) => t.slug === slug);
      if (match && match.id !== tenant?.id) {
        setTenant(match);
        applyTenantBranding(match);
      }
    }
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [tenants, tenant?.id]);

  const persistActive = useCallback((t: Tenant) => {
    try {
      window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, t.slug);
    } catch { /* ignore */ }
    if (!user) return;
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      supabase
        .from('user_active_tenant')
        .upsert({ user_id: user.id, tenant_id: t.id, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.warn('Failed to persist active tenant', error);
        });
    }, 250);
  }, [user]);

  const applyTenant = useCallback((t: Tenant) => {
    setTenant(t);
    applyTenantBranding(t);
    persistActive(t);
  }, [persistActive]);

  const setTenantBySlug = useCallback((slug: string) => {
    const t = tenants.find((x) => x.slug === slug);
    if (t) applyTenant(t);
  }, [tenants, applyTenant]);

  const setTenantById = useCallback((id: string) => {
    const t = tenants.find((x) => x.id === id);
    if (t) applyTenant(t);
  }, [tenants, applyTenant]);

  const getParentTenant = useCallback((): Tenant | null => {
    if (!tenant?.parent_tenant_id) return null;
    return tenants.find((t) => t.id === tenant.parent_tenant_id) || null;
  }, [tenant, tenants]);

  const getChildTenants = useCallback((): Tenant[] => {
    if (!tenant) return [];
    return tenants.filter((t) => t.parent_tenant_id === tenant.id);
  }, [tenant, tenants]);

  const getAncestors = useCallback((): Tenant[] => {
    if (!tenant) return [];
    const ancestors: Tenant[] = [];
    let current: Tenant | undefined = tenant;
    while (current?.parent_tenant_id) {
      const parent = tenants.find((t) => t.id === current!.parent_tenant_id);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }
    return ancestors;
  }, [tenant, tenants]);

  const appName = tenant?.nav_app_name || tenant?.name || 'FGN Academy';

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenants,
        isLoading,
        appName,
        setTenantBySlug,
        setTenantById,
        getParentTenant,
        getChildTenants,
        getAncestors,
      }}
    >
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
