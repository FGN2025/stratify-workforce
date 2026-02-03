import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, ShieldAlert, User, Code, AlertTriangle } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: {
    email: string;
    username?: string;
    role: AppRole;
    tenant_id?: string;
  }) => Promise<boolean>;
  isInviting?: boolean;
  tenants?: Array<{ id: string; name: string; slug: string }>;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onInvite,
  isInviting = false,
  tenants = [],
}: InviteUserDialogProps) {
  const { isSuperAdmin } = useUserRole();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<AppRole>('user');
  const [tenantId, setTenantId] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await onInvite({
      email: email.trim(),
      username: username.trim() || undefined,
      role,
      tenant_id: tenantId || undefined,
    });

    if (success) {
      // Reset form
      setEmail('');
      setUsername('');
      setRole('user');
      setTenantId('');
      onOpenChange(false);
    }
  };

  const getRoleIcon = (r: AppRole) => {
    switch (r) {
      case 'super_admin':
        return <ShieldAlert className="h-4 w-4 text-primary" />;
      case 'admin':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-secondary-foreground" />;
      case 'developer':
        return <Code className="h-4 w-4 text-accent-foreground" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const availableRoles: AppRole[] = isSuperAdmin
    ? ['user', 'developer', 'moderator', 'admin', 'super_admin']
    : ['user', 'developer', 'moderator', 'admin'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isInviting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Suggested Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Optional - user can set during signup"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isInviting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Assign Role *</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as AppRole)}
              disabled={isInviting}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(r)}
                      <span className="capitalize">{r.replace('_', ' ')}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tenants.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Community (Optional)</Label>
              <Select
                value={tenantId || 'none'}
                onValueChange={(value) => setTenantId(value === 'none' ? '' : value)}
                disabled={isInviting}
              >
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Select community" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Global)</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              User will receive an email with a link to complete their registration.
              The selected role will be assigned automatically upon signup.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting || !email}>
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
