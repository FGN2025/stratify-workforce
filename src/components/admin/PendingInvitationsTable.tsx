import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Loader2, Shield, ShieldAlert, User, Code, X } from 'lucide-react';
import { useState } from 'react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Invitation {
  id: string;
  email: string;
  username: string | null;
  role: AppRole;
  tenant_id: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  tenants?: { name: string; slug: string } | null;
}

interface PendingInvitationsTableProps {
  invitations: Invitation[];
  isLoading?: boolean;
  onRevoke: (id: string) => Promise<void>;
  isRevoking?: boolean;
}

export function PendingInvitationsTable({
  invitations,
  isLoading,
  onRevoke,
  isRevoking,
}: PendingInvitationsTableProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await onRevoke(id);
    } finally {
      setRevokingId(null);
    }
  };

  const getRoleBadge = (role: AppRole) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading invitations...
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 w-full justify-start px-0 hover:bg-transparent">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-semibold">Pending Invitations</span>
          <Badge variant="secondary" className="ml-2">
            {invitations.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="rounded-lg border border-border/50 overflow-hidden mt-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date();
                
                return (
                  <TableRow key={invite.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invite.email}</span>
                        {invite.username && (
                          <span className="text-xs text-muted-foreground">
                            Suggested: {invite.username}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(invite.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.tenants?.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(invite.id)}
                        disabled={isRevoking || revokingId === invite.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Revoke
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
