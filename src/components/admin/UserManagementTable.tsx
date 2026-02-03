import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Shield, ShieldAlert, User, UserPlus, Code } from 'lucide-react';
import { RoleAssignmentDialog } from './RoleAssignmentDialog';
import { InviteUserDialog } from './InviteUserDialog';
import { PendingInvitationsTable } from './PendingInvitationsTable';
import { useUserInvitations } from '@/hooks/useUserInvitations';
import { useUserRole } from '@/hooks/useUserRole';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  username: string | null;
  avatar_url: string | null;
  employability_score: number | null;
  updated_at: string;
  role?: AppRole | null;
}

interface UserManagementTableProps {
  users: UserWithRole[];
  isLoading?: boolean;
  onRoleChange: (userId: string, newRole: AppRole) => Promise<void>;
  tenants?: Array<{ id: string; name: string; slug: string }>;
}

export function UserManagementTable({
  users,
  isLoading,
  onRoleChange,
  tenants = [],
}: UserManagementTableProps) {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const canInvite = isAdmin || isSuperAdmin;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const {
    invitations,
    isLoading: invitationsLoading,
    isInviting,
    inviteUser,
    revokeInvitation,
    isRevoking,
  } = useUserInvitations();

  const filteredUsers = users.filter((user) =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: AppRole | null | undefined) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="destructive" className="gap-1 bg-primary/20 text-primary border-primary/30">
            <ShieldAlert className="h-3 w-3" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            Admin
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Moderator
          </Badge>
        );
      case 'developer':
        return (
          <Badge variant="secondary" className="gap-1 bg-accent text-accent-foreground">
            <Code className="h-3 w-3" />
            Developer
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            User
          </Badge>
        );
    }
  };

  const handleUserClick = (user: UserWithRole) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canInvite && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.username?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.username || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {user.employability_score?.toFixed(0) || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserClick(user)}
                    >
                      Manage Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pending Invitations Section */}
      {canInvite && (
        <PendingInvitationsTable
          invitations={invitations}
          isLoading={invitationsLoading}
          onRevoke={revokeInvitation}
          isRevoking={isRevoking}
        />
      )}

      {selectedUser && (
        <RoleAssignmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={selectedUser}
          onRoleChange={onRoleChange}
        />
      )}

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={inviteUser}
        isInviting={isInviting}
        tenants={tenants}
      />
    </div>
  );
}
