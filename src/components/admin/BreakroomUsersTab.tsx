import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface BreakroomUser {
  id: string;
  user_id: string;
  breakroom_username: string;
  breakroom_user_id: number | null;
  tenant_id: string | null;
  created_at: string;
  profiles: { username: string | null } | null;
  tenants: { name: string } | null;
}

interface SearchedUser {
  id: string;
  email: string;
  username: string | null;
}

export function BreakroomUsersTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [brUsername, setBrUsername] = useState('');
  const [brUserId, setBrUserId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('none');
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch breakroom identities
  const { data: users, isLoading } = useQuery({
    queryKey: ['breakroom-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breakroom_identity')
        .select('*, profiles(username), tenants(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BreakroomUser[];
    },
  });

  // Fetch tenants for dropdown
  const { data: tenants } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch emails via edge function
  const { data: emailMap } = useQuery({
    queryKey: ['breakroom-user-emails', users?.map(u => u.user_id)],
    enabled: !!users && users.length > 0,
    queryFn: async () => {
      const userIds = users!.map(u => u.user_id);
      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'get-emails', user_ids: userIds },
      });
      return (data?.emails || {}) as Record<string, string>;
    },
  });

  // Search users
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'search', query: q },
      });
      setSearchResults(data?.users || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('breakroom_identity').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakroom-users'] });
      toast.success('Breakroom user deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !brUsername) throw new Error('Missing fields');
      const { error } = await supabase.from('breakroom_identity').insert({
        user_id: selectedUser.id,
        breakroom_username: brUsername,
        breakroom_user_id: brUserId ? parseInt(brUserId) : null,
        tenant_id: selectedTenant !== 'none' ? selectedTenant : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakroom-users'] });
      toast.success('Breakroom user added');
      resetAddForm();
    },
    onError: (e) => toast.error(e.message || 'Failed to add user'),
  });

  const resetAddForm = () => {
    setAddOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setBrUsername('');
    setBrUserId('');
    setSelectedTenant('none');
  };

  // Inline edit save
  const handleInlineSave = useCallback(async (row: BreakroomUser, field: 'breakroom_username' | 'breakroom_user_id') => {
    setEditingField(null);
    const oldValue = field === 'breakroom_username' ? row.breakroom_username : row.breakroom_user_id;
    const newValue = field === 'breakroom_username' ? editValue : (editValue ? parseInt(editValue) : null);
    if (String(newValue) === String(oldValue)) return;

    const updateData = { [field]: newValue };

    // Optimistic
    queryClient.setQueryData(['breakroom-users'], (old: BreakroomUser[] | undefined) =>
      old?.map(u => u.id === row.id ? { ...u, ...updateData } : u)
    );

    const { error } = await supabase.from('breakroom_identity').update(updateData).eq('id', row.id);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ['breakroom-users'] });
      toast.error('Failed to save');
    } else {
      toast.success('Saved');
    }
  }, [editValue, queryClient]);

  const exportCSV = () => {
    if (!users) return;
    const headers = ['FGN Display Name', 'Email', 'Breakroom Username', 'Breakroom User ID', 'Tenant', 'Created At'];
    const rows = users.map(u => [
      u.profiles?.username || '',
      emailMap?.[u.user_id] || '',
      u.breakroom_username,
      u.breakroom_user_id?.toString() || '',
      u.tenants?.name || '',
      format(new Date(u.created_at), 'yyyy-MM-dd'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breakroom_users.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Breakroom User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Search by Email</Label>
                <Input
                  placeholder="Type at least 3 characters..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                />
                {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                {searchResults.length > 0 && !selectedUser && (
                  <div className="border rounded mt-1 max-h-40 overflow-y-auto">
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                        onClick={() => {
                          setSelectedUser(u);
                          setSearchResults([]);
                        }}
                      >
                        <span className="font-medium">{u.username || 'No name'}</span>
                        <span className="text-muted-foreground ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="flex items-center gap-2 mt-1 text-sm bg-muted px-3 py-1.5 rounded">
                    <span className="font-medium">{selectedUser.username || selectedUser.email}</span>
                    <button
                      onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                      className="text-muted-foreground hover:text-foreground ml-auto"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div>
                <Label>Breakroom Username *</Label>
                <Input value={brUsername} onChange={e => setBrUsername(e.target.value)} />
              </div>
              <div>
                <Label>Breakroom User ID</Label>
                <Input type="number" value={brUserId} onChange={e => setBrUserId(e.target.value)} />
              </div>
              <div>
                <Label>Tenant</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tenants?.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetAddForm}>Cancel</Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!selectedUser || !brUsername || addMutation.isPending}
              >
                {addMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {!users || users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No Breakroom users linked</p>
          <p className="text-sm mt-1">Click "Add User" to link a platform user to their Breakroom identity.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>FGN Display Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Breakroom Username</TableHead>
                <TableHead>Breakroom User ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.profiles?.username || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {emailMap?.[u.user_id] || '—'}
                  </TableCell>
                  <TableCell>
                    {editingField?.id === u.id && editingField.field === 'breakroom_username' ? (
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleInlineSave(u, 'breakroom_username')}
                        onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(u, 'breakroom_username'); }}
                        className="h-7 text-xs"
                        autoFocus
                      />
                    ) : (
                      <button
                        className="text-xs text-left w-full px-2 py-1 rounded hover:bg-muted transition-colors"
                        onClick={() => { setEditingField({ id: u.id, field: 'breakroom_username' }); setEditValue(u.breakroom_username); }}
                      >
                        {u.breakroom_username}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingField?.id === u.id && editingField.field === 'breakroom_user_id' ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleInlineSave(u, 'breakroom_user_id')}
                        onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(u, 'breakroom_user_id'); }}
                        className="h-7 text-xs w-24"
                        autoFocus
                      />
                    ) : (
                      <button
                        className="text-xs text-left px-2 py-1 rounded hover:bg-muted transition-colors"
                        onClick={() => { setEditingField({ id: u.id, field: 'breakroom_user_id' }); setEditValue(u.breakroom_user_id?.toString() || ''); }}
                      >
                        {u.breakroom_user_id ?? <span className="text-muted-foreground italic">—</span>}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{u.tenants?.name || 'None'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(u.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Breakroom Link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the link between {u.profiles?.username || 'this user'} and
                            Breakroom user "{u.breakroom_username}". This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(u.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
