import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, CheckCircle, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type CategoryType = Database['public']['Enums']['community_category_type'];

interface TenantFormData {
  name: string;
  slug: string;
  description: string;
  category_type: CategoryType | null;
  brand_color: string;
}

const defaultFormData: TenantFormData = {
  name: '',
  slug: '',
  description: '',
  category_type: null,
  brand_color: '#3B82F6',
};

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<TenantFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load tenants', variant: 'destructive' });
    } else {
      setTenants(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenDialog = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description || '',
        category_type: tenant.category_type,
        brand_color: tenant.brand_color,
      });
    } else {
      setEditingTenant(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast({ title: 'Error', description: 'Name and slug are required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingTenant) {
        const { error } = await supabase
          .from('tenants')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            category_type: formData.category_type,
            brand_color: formData.brand_color,
          })
          .eq('id', editingTenant.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Tenant updated successfully' });
      } else {
        const { error } = await supabase
          .from('tenants')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            category_type: formData.category_type,
            brand_color: formData.brand_color,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Tenant created successfully' });
      }

      setIsDialogOpen(false);
      fetchTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast({ title: 'Error', description: 'Failed to save tenant', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Delete "${tenant.name}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('tenants').delete().eq('id', tenant.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${tenant.name} has been deleted` });
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({ title: 'Error', description: 'Failed to delete tenant', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tenant/Community Management</h3>
          <p className="text-sm text-muted-foreground">
            Create, edit, and delete communities across the platform
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Create Tenant'}</DialogTitle>
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
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="community-slug"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_type || ''}
                  onValueChange={(v) => setFormData({ ...formData, category_type: v as CategoryType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geography">Geography</SelectItem>
                    <SelectItem value="broadband_provider">Broadband Provider</SelectItem>
                    <SelectItem value="trade_skill">Trade Skill</SelectItem>
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
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTenant ? 'Update Tenant' : 'Create Tenant'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tenant.brand_color }}
                  />
                  {tenant.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
              <TableCell>
                {tenant.category_type && (
                  <Badge variant="outline" className="capitalize">
                    {tenant.category_type.replace('_', ' ')}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {tenant.member_count}
                </div>
              </TableCell>
              <TableCell>
                {tenant.is_verified ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">Unverified</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(tenant)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(tenant)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No tenants found. Create your first one!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
