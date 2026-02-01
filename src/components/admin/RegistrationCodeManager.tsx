import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Copy, Loader2, Pencil, Search, X, Power, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { RegistrationCodeEditDialog } from './RegistrationCodeEditDialog';

interface RegistrationCode {
  id: string;
  code: string;
  tenant_id: string | null;
  created_by: string;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  tenants?: { name: string } | null;
}

interface Tenant {
  id: string;
  name: string;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'expired' | 'exhausted';

export function RegistrationCodeManager() {
  const { logAction } = useAuditLog();
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCode, setEditingCode] = useState<RegistrationCode | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  // Confirmation dialog state for bulk actions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  // Form state
  const [newCode, setNewCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  useEffect(() => {
    fetchCodes();
    fetchTenants();
  }, []);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('registration_codes')
        .select(`
          *,
          tenants (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registration codes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(result);
  };

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a code.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.from('registration_codes').insert({
        code: newCode.trim().toUpperCase(),
        description: description.trim() || null,
        tenant_id: selectedTenant && selectedTenant !== 'none' ? selectedTenant : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        created_by: user.id,
      }).select('id').single();

      if (error) throw error;

      // Log audit action
      await logAction({
        resourceType: 'registration_code',
        action: 'created',
        resourceId: data?.id,
        details: {
          code: newCode.trim().toUpperCase(),
          tenant_id: selectedTenant && selectedTenant !== 'none' ? selectedTenant : null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          expires_at: expiresAt || null,
        },
      });

      toast({
        title: 'Code Created',
        description: `Registration code ${newCode} created successfully.`,
      });

      // Reset form
      setNewCode('');
      setDescription('');
      setSelectedTenant('');
      setMaxUses('');
      setExpiresAt('');
      setIsDialogOpen(false);
      fetchCodes();
    } catch (error: unknown) {
      console.error('Error creating code:', error);
      const message = error instanceof Error && error.message.includes('unique')
        ? 'This code already exists.'
        : 'Failed to create registration code.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (code: RegistrationCode) => {
    try {
      const { error } = await supabase
        .from('registration_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;

      setCodes(prev =>
        prev.map(c => (c.id === code.id ? { ...c, is_active: !c.is_active } : c))
      );

      toast({
        title: code.is_active ? 'Code Deactivated' : 'Code Activated',
        description: `Code ${code.code} has been ${code.is_active ? 'deactivated' : 'activated'}.`,
      });
    } catch (error) {
      console.error('Error toggling code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update code status.',
        variant: 'destructive',
      });
    }
  };

  const deleteCode = async (code: RegistrationCode) => {
    if (!confirm(`Are you sure you want to delete code ${code.code}?`)) return;

    try {
      const { error } = await supabase
        .from('registration_codes')
        .delete()
        .eq('id', code.id);

      if (error) throw error;

      setCodes(prev => prev.filter(c => c.id !== code.id));

      toast({
        title: 'Code Deleted',
        description: `Code ${code.code} has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete code.',
        variant: 'destructive',
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied',
      description: 'Code copied to clipboard.',
    });
  };

  const getCodeStatus = (code: RegistrationCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; key: StatusFilter } => {
    if (!code.is_active) return { label: 'Inactive', variant: 'secondary', key: 'inactive' };
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: 'Expired', variant: 'destructive', key: 'expired' };
    }
    if (code.max_uses !== null && code.current_uses >= code.max_uses) {
      return { label: 'Exhausted', variant: 'outline', key: 'exhausted' };
    }
    return { label: 'Active', variant: 'default', key: 'active' };
  };

  // Filtered codes based on search and filters
  const filteredCodes = useMemo(() => {
    return codes.filter((code) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (code.description?.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const status = getCodeStatus(code);
      const matchesStatus = statusFilter === 'all' || status.key === statusFilter;

      // Tenant filter
      const matchesTenant = tenantFilter === 'all' || 
        (tenantFilter === 'global' && !code.tenant_id) ||
        code.tenant_id === tenantFilter;

      return matchesSearch && matchesStatus && matchesTenant;
    });
  }, [codes, searchQuery, statusFilter, tenantFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTenantFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || tenantFilter !== 'all';

  // Selection helpers
  const allFilteredSelected = filteredCodes.length > 0 && filteredCodes.every((c) => selectedIds.has(c.id));
  const someFilteredSelected = filteredCodes.some((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered codes
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCodes.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      // Select all filtered codes
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCodes.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Open confirmation dialog for bulk actions
  const openBulkConfirmDialog = (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.size === 0) return;
    setConfirmDialogAction(action);
    setConfirmDialogOpen(true);
  };

  // Execute the confirmed bulk action
  const executeBulkAction = async () => {
    if (!confirmDialogAction || selectedIds.size === 0) return;
    
    setConfirmDialogOpen(false);
    setIsBulkActionLoading(true);
    
    try {
      const idsArray = Array.from(selectedIds);
      
      if (confirmDialogAction === 'activate') {
        const { error } = await supabase
          .from('registration_codes')
          .update({ is_active: true })
          .in('id', idsArray);
        if (error) throw error;
        
        await logAction({
          resourceType: 'registration_code',
          action: 'bulk_activate',
          details: { count: idsArray.length, code_ids: idsArray },
        });
        
        toast({
          title: 'Codes Activated',
          description: `${idsArray.length} code(s) have been activated.`,
        });
      } else if (confirmDialogAction === 'deactivate') {
        const { error } = await supabase
          .from('registration_codes')
          .update({ is_active: false })
          .in('id', idsArray);
        if (error) throw error;
        
        await logAction({
          resourceType: 'registration_code',
          action: 'bulk_deactivate',
          details: { count: idsArray.length, code_ids: idsArray },
        });
        
        toast({
          title: 'Codes Deactivated',
          description: `${idsArray.length} code(s) have been deactivated.`,
        });
      } else if (confirmDialogAction === 'delete') {
        const codesToDelete = codes.filter((c) => idsArray.includes(c.id));
        
        const { error } = await supabase
          .from('registration_codes')
          .delete()
          .in('id', idsArray);
        if (error) throw error;
        
        await logAction({
          resourceType: 'registration_code',
          action: 'bulk_delete',
          details: { count: idsArray.length, codes: codesToDelete.map((c) => c.code) },
        });
        
        toast({
          title: 'Codes Deleted',
          description: `${idsArray.length} code(s) have been permanently deleted.`,
        });
      }
      
      clearSelection();
      fetchCodes();
    } catch (error) {
      console.error(`Error performing bulk ${confirmDialogAction}:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${confirmDialogAction} codes.`,
        variant: 'destructive',
      });
    } finally {
      setIsBulkActionLoading(false);
      setConfirmDialogAction(null);
    }
  };

  const getConfirmDialogContent = () => {
    const count = selectedIds.size;
    switch (confirmDialogAction) {
      case 'activate':
        return {
          title: 'Activate Codes',
          description: `Are you sure you want to activate ${count} selected code(s)? They will become usable for registration.`,
          actionLabel: 'Activate',
        };
      case 'deactivate':
        return {
          title: 'Deactivate Codes',
          description: `Are you sure you want to deactivate ${count} selected code(s)? They will no longer be usable for registration.`,
          actionLabel: 'Deactivate',
        };
      case 'delete':
        return {
          title: 'Delete Codes',
          description: `Are you sure you want to permanently delete ${count} selected code(s)? This action cannot be undone.`,
          actionLabel: 'Delete',
        };
      default:
        return { title: '', description: '', actionLabel: '' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Registration Codes</h3>
          <p className="text-sm text-muted-foreground">
            Create codes that allow users to bypass address verification during registration.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Registration Code</DialogTitle>
              <DialogDescription>
                Create a new code that allows users to skip address verification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="ACADEMY2025"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Generate
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Internal notes about this code..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant">Associate with Tenant (optional)</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tenant (global code)</SelectItem>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max Uses (optional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires At (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newCode.trim()}
                className="w-full"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="exhausted">Exhausted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            <SelectItem value="global">Global (No Tenant)</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between">
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredCodes.length} of {codes.length} codes
          </p>
        )}
        {!hasActiveFilters && <div />}
        
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg border">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkConfirmDialog('activate')}
              disabled={isBulkActionLoading}
            >
              <Power className="h-4 w-4 mr-1" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkConfirmDialog('deactivate')}
              disabled={isBulkActionLoading}
            >
              <PowerOff className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openBulkConfirmDialog('delete')}
              disabled={isBulkActionLoading}
            >
              {isBulkActionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No registration codes yet. Create one to get started.
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No codes match your filters.{' '}
          <button onClick={clearFilters} className="text-primary hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className={someFilteredSelected && !allFilteredSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  />
                </TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.map((code) => {
                const status = getCodeStatus(code);
                const isSelected = selectedIds.has(code.id);
                return (
                  <TableRow key={code.id} className={isSelected ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectOne(code.id)}
                        aria-label={`Select ${code.code}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {code.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {code.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.tenants?.name || (
                        <span className="text-muted-foreground">Global</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.current_uses}
                      {code.max_uses !== null && ` / ${code.max_uses}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {code.expires_at
                        ? format(new Date(code.expires_at), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={code.is_active}
                        onCheckedChange={() => toggleActive(code)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingCode(code);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteCode(code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <RegistrationCodeEditDialog
        code={editingCode}
        tenants={tenants}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSaved={fetchCodes}
      />

      {/* Bulk action confirmation dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={confirmDialogAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {getConfirmDialogContent().actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
