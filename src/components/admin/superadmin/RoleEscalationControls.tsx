import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ShieldCheck, ShieldAlert, User, Crown, Loader2, Code } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  username: string | null;
  avatar_url: string | null;
  email?: string;
  role: AppRole | null;
}

const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  super_admin: { label: 'Super Admin', icon: <Crown className="h-4 w-4" />, color: 'text-amber-400' },
  admin: { label: 'Admin', icon: <ShieldCheck className="h-4 w-4" />, color: 'text-blue-400' },
  moderator: { label: 'Moderator', icon: <ShieldAlert className="h-4 w-4" />, color: 'text-green-400' },
  developer: { label: 'Developer', icon: <Code className="h-4 w-4" />, color: 'text-purple-400' },
  user: { label: 'User', icon: <User className="h-4 w-4" />, color: 'text-muted-foreground' },
};

export function RoleEscalationControls() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<{ userId: string; newRole: AppRole } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .order('username');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));

      // Sort: super_admin first, then admin, then moderator, then users
      const roleOrder: Record<string, number> = { super_admin: 0, admin: 1, moderator: 2, user: 3 };
      usersWithRoles.sort((a, b) => {
        const aOrder = roleOrder[a.role || 'user'] ?? 4;
        const bOrder = roleOrder[b.role || 'user'] ?? 4;
        return aOrder - bOrder;
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    // Prevent self-demotion
    if (userId === currentUser?.id && newRole !== 'super_admin') {
      toast({
        title: 'Cannot Change Own Role',
        description: 'You cannot demote yourself from super_admin',
        variant: 'destructive',
      });
      return;
    }

    setPendingChange({ userId, newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingChange) return;

    const { userId, newRole } = pendingChange;
    const targetUser = users.find(u => u.id === userId);

    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      // Log the action
      await supabase.from('system_audit_logs').insert({
        actor_id: currentUser?.id,
        action: 'role_change',
        resource_type: 'user_role',
        resource_id: userId,
        details: {
          target_username: targetUser?.username,
          old_role: targetUser?.role,
          new_role: newRole,
        },
      });

      toast({
        title: 'Role Updated',
        description: `${targetUser?.username || 'User'} is now a ${roleConfig[newRole].label}`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } finally {
      setPendingChange(null);
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
      <div>
        <h3 className="text-lg font-semibold">Role Escalation Controls</h3>
        <p className="text-sm text-muted-foreground">
          Promote or demote users to admin, moderator, developer, or super_admin roles
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Elevated Privileges Warning</p>
            <p className="text-sm text-muted-foreground">
              Role changes take effect immediately. Super admins have full system access including 
              dangerous operations. Only assign elevated roles to trusted users.
            </p>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>Change Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const config = user.role ? roleConfig[user.role] : roleConfig.user;
            const isSelf = user.id === currentUser?.id;

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user.username || 'Unknown'}</p>
                      {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={config.color}>
                    <span className="mr-1">{config.icon}</span>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role || 'user'}
                    onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                    disabled={isSelf}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-400" />
                          Super Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-400" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="moderator">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-green-400" />
                          Moderator
                        </div>
                      </SelectItem>
                      <SelectItem value="developer">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-purple-400" />
                          Developer
                        </div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!pendingChange} onOpenChange={() => setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change this user's role to{' '}
              <strong>{pendingChange && roleConfig[pendingChange.newRole].label}</strong>?
              This action will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
