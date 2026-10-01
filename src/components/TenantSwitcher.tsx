import { useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Building2, Check } from 'lucide-react';

export function TenantSwitcher({ variant = 'select' }: { variant?: 'select' | 'menu' } = {}) {
  const { tenant, tenants, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  if (tenants.length === 0) return null;

  const handleValueChange = (value: string) => {
    if (value.startsWith('__missing_slug__')) return;
    setTenantBySlug(value);
    // If the URL is currently tenant-prefixed, swap the slug in the URL so it
    // stays shareable.
    const m = location.pathname.match(/^\/t\/[^/]+(\/.*)?$/);
    if (m) {
      navigate(`/t/${value}${m[1] || ''}${location.search}${location.hash}`, { replace: true });
    }
  };

  if (variant === 'menu') {
    // Plain menu items: safe inside a dropdown menu (a nested Select portal
    // would dismiss the menu before the choice registers).
    if (tenants.length < 2) return null;
    return (
      <>
        {tenants.map((t) => {
          const slug = (t.slug || '').trim();
          if (!slug) return null;
          const active = slug === tenant?.slug;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => { if (!active) handleValueChange(slug); }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.brand_color }} />
              <span className="flex-1 truncate">{t.name}</span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </>
    );
  }

  return (
    <Select value={tenant?.slug || ''} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px] glass-card border-glass-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Select tenant" />
        </div>
      </SelectTrigger>
      <SelectContent className="glass-card border-glass-border">
        {tenants.map((t) => {
          const slug = (t.slug || '').trim();
          const isValidSlug = slug.length > 0;
          const value = isValidSlug ? slug : `__missing_slug__${t.id}`;

          return (
            <SelectItem
              key={t.id}
              value={value}
              disabled={!isValidSlug}
              className={isValidSlug ? 'cursor-pointer' : undefined}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: t.brand_color }}
                />
                <span>
                  {t.name}
                  {!isValidSlug ? ' (missing slug)' : ''}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
