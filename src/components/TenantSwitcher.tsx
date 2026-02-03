import { useTenant } from '@/contexts/TenantContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export function TenantSwitcher() {
  const { tenant, tenants, setTenantBySlug } = useTenant();

  if (tenants.length === 0) return null;

  const handleValueChange = (value: string) => {
    // Prevent crashes / bad state if a tenant has a missing slug.
    if (value.startsWith('__missing_slug__')) return;
    setTenantBySlug(value);
  };

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
