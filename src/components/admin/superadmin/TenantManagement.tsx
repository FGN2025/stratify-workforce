import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, CheckCircle, Loader2, Trash, TreeDeciduous, List } from 'lucide-react';
import { useTenantHierarchy } from '@/hooks/useTenantHierarchy';
import { TenantHierarchyTree } from './TenantHierarchyTree';
import { TenantFormDialog, type TenantFormData } from './TenantFormDialog';
import type { Tenant } from '@/types/tenant';
import { CATEGORY_LABELS } from '@/types/tenant';

export function TenantManagement() {
  const { tenants, buildTree, isLoading, refetch } = useTenantHierarchy();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  const treeData = buildTree();

  const handleOpenDialog = (tenant?: Tenant) => {
    setEditingTenant(tenant || null);
    setIsDialogOpen(true);
  };

  const handleSave = async (formData: TenantFormData) => {
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
            parent_tenant_id: formData.parent_tenant_id,
            hierarchy_level: formData.hierarchy_level,
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
            parent_tenant_id: formData.parent_tenant_id,
            hierarchy_level: formData.hierarchy_level,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Tenant created successfully' });
      }

      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast({ title: 'Error', description: 'Failed to save tenant', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (tenant: Tenant) => {
    setDeletingTenant(tenant);
  };

  const confirmDelete = async () => {
    if (!deletingTenant) return;

    try {
      const { error } = await supabase.from('tenants').delete().eq('id', deletingTenant.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${deletingTenant.name} has been deleted` });
      refetch();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({ title: 'Error', description: 'Failed to delete tenant', variant: 'destructive' });
    } finally {
      setDeletingTenant(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenants.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: `${selectedIds.size} tenant(s) have been deleted`,
      });
      setSelectedIds(new Set());
      refetch();
    } catch (error) {
      console.error('Error bulk deleting tenants:', error);
      toast({ title: 'Error', description: 'Failed to delete tenants', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
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
            Create, edit, and manage hierarchical organizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tenant
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'tree')}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="tree">
            <TreeDeciduous className="mr-2 h-4 w-4" />
            Tree View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="mt-4">
          <TenantHierarchyTree
            tenants={treeData}
            onSelect={(tenant) => handleOpenDialog(tenant)}
            selectedId={editingTenant?.id}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={tenants.length > 0 && selectedIds.size === tenants.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const parent = tenants.find(t => t.id === tenant.parent_tenant_id);
                return (
                  <TableRow key={tenant.id} data-state={selectedIds.has(tenant.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(tenant.id)}
                        onCheckedChange={() => toggleSelect(tenant.id)}
                        aria-label={`Select ${tenant.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tenant.brand_color }}
                        />
                        {tenant.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {parent?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.hierarchy_level}</Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.category_type && (
                        <Badge variant="outline" className="capitalize">
                          {CATEGORY_LABELS[tenant.category_type] || tenant.category_type}
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
                );
              })}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No tenants found. Create your first one!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <TenantFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tenant={editingTenant}
        tenants={tenants}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deletingTenant} onOpenChange={() => setDeletingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTenant?.name}"? 
              This action cannot be undone and will remove all associated data.
              {deletingTenant && tenants.some(t => t.parent_tenant_id === deletingTenant.id) && (
                <span className="block mt-2 text-amber-500">
                  Warning: This tenant has child organizations that will become orphaned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Tenant(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected tenant(s)?
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {selectedIds.size} Tenant(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
