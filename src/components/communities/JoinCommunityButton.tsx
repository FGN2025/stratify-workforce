import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Clock, X, LogIn, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useMembershipStatus, 
  useRequestMembership, 
  useCancelMembershipRequest,
  useIsManager 
} from '@/hooks/useMembershipRequest';
import { cn } from '@/lib/utils';

interface JoinCommunityButtonProps {
  tenantId: string;
  brandColor?: string;
  className?: string;
}

export function JoinCommunityButton({ tenantId, brandColor, className }: JoinCommunityButtonProps) {
  const { user } = useAuth();
  const { data: membershipStatus, isLoading: statusLoading } = useMembershipStatus(tenantId);
  const { data: isManager } = useIsManager(tenantId);
  const requestMembership = useRequestMembership();
  const cancelRequest = useCancelMembershipRequest();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Not logged in
  if (!user) {
    return (
      <Button 
        variant="outline" 
        className={cn("gap-2", className)}
        onClick={() => window.location.href = '/auth'}
      >
        <LogIn className="h-4 w-4" />
        Sign in to Join
      </Button>
    );
  }

  if (statusLoading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // User is a manager/admin/owner
  if (isManager) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "h-9 px-4 gap-2 text-sm font-medium",
          "bg-primary/10 border-primary/30 text-primary",
          className
        )}
      >
        <Shield className="h-4 w-4" />
        Managing
      </Badge>
    );
  }

  // No membership - show join button
  if (!membershipStatus) {
    return (
      <Button
        className={cn("gap-2", className)}
        style={brandColor ? { backgroundColor: brandColor } : undefined}
        onClick={() => requestMembership.mutate(tenantId)}
        disabled={requestMembership.isPending}
      >
        {requestMembership.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Join Community
      </Button>
    );
  }

  // Pending request
  if (membershipStatus.request_status === 'pending') {
    if (showCancelConfirm) {
      return (
        <div className={cn("flex gap-2", className)}>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              cancelRequest.mutate({ 
                membershipId: membershipStatus.id, 
                tenantId 
              });
              setShowCancelConfirm(false);
            }}
            disabled={cancelRequest.isPending}
          >
            {cancelRequest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Cancel Request'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelConfirm(false)}
          >
            Keep
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        className={cn(
          "gap-2 cursor-default",
          "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20",
          className
        )}
        onClick={() => setShowCancelConfirm(true)}
      >
        <Clock className="h-4 w-4" />
        Request Pending
      </Button>
    );
  }

  // Approved member
  if (membershipStatus.request_status === 'approved') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "h-9 px-4 gap-2 text-sm font-medium",
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
          className
        )}
      >
        <Check className="h-4 w-4" />
        Member
      </Badge>
    );
  }

  // Rejected
  if (membershipStatus.request_status === 'rejected') {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Badge 
          variant="outline" 
          className="h-9 px-4 gap-2 text-sm font-medium bg-rose-500/10 border-rose-500/30 text-rose-500"
        >
          <X className="h-4 w-4" />
          Request Denied
        </Badge>
        {membershipStatus.reviewer_notes && (
          <p className="text-xs text-muted-foreground max-w-[200px]">
            "{membershipStatus.reviewer_notes}"
          </p>
        )}
      </div>
    );
  }

  return null;
}
