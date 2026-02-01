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

  return (
    <Select value={tenant?.slug || ''} onValueChange={setTenantBySlug}>
      <SelectTrigger className="w-[200px] glass-card border-glass-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Select tenant" />
        </div>
      </SelectTrigger>
      <SelectContent className="glass-card border-glass-border">
        {tenants.map((t) => (
          <SelectItem key={t.id} value={t.slug} className="cursor-pointer">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: t.brand_color }}
              />
              <span>{t.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
