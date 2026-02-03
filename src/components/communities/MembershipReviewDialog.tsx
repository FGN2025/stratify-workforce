import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useApproveMembership, 
  useRejectMembership, 
  useRemoveMember,
  type MembershipRequest 
} from '@/hooks/useMembershipReview';
import { format } from 'date-fns';
import { Loader2, Check, X, Clock, UserMinus, Shield } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type CommunityMembershipRole = Database['public']['Enums']['community_membership_role'];

const ASSIGNABLE_ROLES: { value: CommunityMembershipRole; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'student', label: 'Student' },
  { value: 'employee', label: 'Employee' },
  { value: 'apprentice', label: 'Apprentice' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'manager', label: 'Manager' },
];

interface MembershipReviewDialogProps {
  request: MembershipRequest;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MembershipReviewDialog({ 
  request, 
  tenantId,
  open, 
  onOpenChange 
}: MembershipReviewDialogProps) {
  const [notes, setNotes] = useState(request.reviewer_notes || '');
  const [selectedRole, setSelectedRole] = useState<CommunityMembershipRole>(request.role);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const approveMembership = useApproveMembership();
  const rejectMembership = useRejectMembership();
  const removeMember = useRemoveMember();

  const isPending = request.request_status === 'pending';
  const isApproved = request.request_status === 'approved';

  const handleApprove = () => {
    approveMembership.mutate(
      { membershipId: request.id, tenantId, role: selectedRole },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleReject = () => {
    rejectMembership.mutate(
      { membershipId: request.id, tenantId, notes },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleRemove = () => {
    removeMember.mutate(
      { membershipId: request.id, tenantId },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isPending ? 'Review Membership Request' : 'Membership Details'}
          </DialogTitle>
          <DialogDescription>
            {isPending 
              ? 'Review this request and approve or reject the membership.'
              : 'View membership details and manage this member.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={request.profile?.avatar_url || ''} />
              <AvatarFallback className="text-lg">
                {request.profile?.username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">
                {request.profile?.username || 'Unknown User'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Requested {request.requested_at 
                  ? format(new Date(request.requested_at), 'MMMM d, yyyy')
                  : 'N/A'}
              </p>
              <Badge 
                variant="outline" 
                className={`mt-2 gap-1 text-xs capitalize ${
                  request.request_status === 'pending' 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : request.request_status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                {request.request_status === 'pending' && <Clock className="h-3 w-3" />}
                {request.request_status === 'approved' && <Check className="h-3 w-3" />}
                {request.request_status === 'rejected' && <X className="h-3 w-3" />}
                {request.request_status}
              </Badge>
            </div>
          </div>

          {/* Role Selection (for pending requests) */}
          {isPending && (
            <div className="space-y-2">
              <Label>Assign Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CommunityMembershipRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        {['manager', 'moderator', 'instructor'].includes(role.value) && (
                          <Shield className="h-3 w-3 text-primary" />
                        )}
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the role this member will have in your community.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>{isPending ? 'Review Notes (optional for approval)' : 'Review Notes'}</Label>
            <Textarea
              placeholder={isPending ? 'Add notes about this request...' : ''}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={!isPending}
            />
          </div>

          {/* Reviewed By (for non-pending) */}
          {!isPending && request.reviewed_at && (
            <div className="text-sm text-muted-foreground">
              Reviewed on {format(new Date(request.reviewed_at), 'MMMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          {isApproved && !showRemoveConfirm && (
            <Button
              variant="outline"
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              onClick={() => setShowRemoveConfirm(true)}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remove Member
            </Button>
          )}
          
          {showRemoveConfirm && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Remove
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRemoveConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          {!isApproved && !showRemoveConfirm && <div />}

          {isPending && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                onClick={handleReject}
                disabled={rejectMembership.isPending}
              >
                {rejectMembership.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMembership.isPending}
              >
                {approveMembership.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}

          {!isPending && !showRemoveConfirm && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
