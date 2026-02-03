import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Shield, ShieldAlert, User, Code } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserInfo {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role?: AppRole | null;
}

interface RoleAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo;
  onRoleChange: (userId: string, newRole: AppRole) => Promise<void>;
}

export function RoleAssignmentDialog({
  open,
  onOpenChange,
  user,
  onRoleChange,
}: RoleAssignmentDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>(user.role || 'user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedRole === user.role) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onRoleChange(user.id, selectedRole);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-amber-500" />;
      case 'developer':
        return <Code className="h-4 w-4 text-purple-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage User Role</DialogTitle>
          <DialogDescription>
            Change the role and permissions for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>
              {user.username?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.username || 'Unknown User'}</p>
            <p className="text-sm text-muted-foreground">
              Current role: {user.role || 'user'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Assign Role</label>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  {getRoleIcon('user')}
                  <span>User</span>
                  <span className="text-xs text-muted-foreground ml-2">Standard access</span>
                </div>
              </SelectItem>
              <SelectItem value="moderator">
                <div className="flex items-center gap-2">
                  {getRoleIcon('moderator')}
                  <span>Moderator</span>
                  <span className="text-xs text-muted-foreground ml-2">Content moderation</span>
                </div>
              </SelectItem>
              <SelectItem value="developer">
                <div className="flex items-center gap-2">
                  {getRoleIcon('developer')}
                  <span>Developer</span>
                  <span className="text-xs text-muted-foreground ml-2">API credential management</span>
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  {getRoleIcon('admin')}
                  <span>Admin</span>
                  <span className="text-xs text-muted-foreground ml-2">Full system access</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
