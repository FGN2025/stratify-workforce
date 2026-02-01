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
import { Search, Shield, ShieldAlert, User } from 'lucide-react';
import { RoleAssignmentDialog } from './RoleAssignmentDialog';
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
}

export function UserManagementTable({
  users,
  isLoading,
  onRoleChange,
}: UserManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredUsers = users.filter((user) =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: AppRole | null | undefined) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            Admin
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-500 border-amber-500/30">
            <Shield className="h-3 w-3" />
            Moderator
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

      {selectedUser && (
        <RoleAssignmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={selectedUser}
          onRoleChange={onRoleChange}
        />
      )}
    </div>
  );
}
