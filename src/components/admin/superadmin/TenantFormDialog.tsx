import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Tenant, CategoryType } from '@/types/tenant';
import { CATEGORY_LABELS } from '@/types/tenant';

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  tenants: Tenant[];
  onSave: (data: TenantFormData) => Promise<void>;
  isSaving: boolean;
}

export interface TenantFormData {
  name: string;
  slug: string;
  description: string;
  category_type: CategoryType | null;
  brand_color: string;
  parent_tenant_id: string | null;
  hierarchy_level: number;
}

const defaultFormData: TenantFormData = {
  name: '',
  slug: '',
  description: '',
  category_type: null,
  brand_color: '#3B82F6',
  parent_tenant_id: null,
  hierarchy_level: 0,
};

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  tenants,
  onSave,
  isSaving,
}: TenantFormDialogProps) {
  const [formData, setFormData] = useState<TenantFormData>(defaultFormData);

  // Available parent tenants (exclude self and descendants)
  const availableParents = tenants.filter(t => {
    if (!tenant) return true;
    if (t.id === tenant.id) return false;
    // Prevent circular references - check if this tenant is a descendant of the editing tenant
    let current = t;
    while (current.parent_tenant_id) {
      if (current.parent_tenant_id === tenant.id) return false;
      current = tenants.find(p => p.id === current.parent_tenant_id) || current;
      if (current.parent_tenant_id === current.id) break; // Safety check
    }
    return true;
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description || '',
        category_type: tenant.category_type,
        brand_color: tenant.brand_color,
        parent_tenant_id: tenant.parent_tenant_id,
        hierarchy_level: tenant.hierarchy_level,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [tenant, open]);

  // Calculate hierarchy level based on parent
  const handleParentChange = (parentId: string | null) => {
    let level = 0;
    if (parentId && parentId !== 'none') {
      const parent = tenants.find(t => t.id === parentId);
      level = (parent?.hierarchy_level ?? 0) + 1;
    }
    setFormData({
      ...formData,
      parent_tenant_id: parentId === 'none' ? null : parentId,
      hierarchy_level: level,
    });
  };

  const handleSubmit = async () => {
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tenant ? 'Edit Tenant' : 'Create Tenant'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Community name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })
              }
              placeholder="community-slug"
            />
          </div>

          <div className="space-y-2">
            <Label>Parent Organization</Label>
            <Select
              value={formData.parent_tenant_id || 'none'}
              onValueChange={handleParentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {availableParents.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {'—'.repeat(t.hierarchy_level)} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.hierarchy_level > 0 && (
              <p className="text-xs text-muted-foreground">
                Hierarchy Level: {formData.hierarchy_level}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_type || undefined}
              onValueChange={(v) =>
                setFormData({ ...formData, category_type: v as CategoryType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Community description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.brand_color}
                onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.brand_color}
                onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tenant ? 'Update Tenant' : 'Create Tenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
