import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MembershipReviewDialog } from './MembershipReviewDialog';
import { useMembershipRequests, type MembershipRequest } from '@/hooks/useMembershipReview';
import { Loader2, Users, Clock, Check, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type MembershipRequestStatus = Database['public']['Enums']['membership_request_status'];

const STATUS_STYLES: Record<MembershipRequestStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const STATUS_ICONS: Record<MembershipRequestStatus, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  approved: <Check className="h-3 w-3" />,
  rejected: <X className="h-3 w-3" />,
};

interface MembershipReviewQueueProps {
  tenantId: string;
}

export function MembershipReviewQueue({ tenantId }: MembershipReviewQueueProps) {
  const [statusFilter, setStatusFilter] = useState<MembershipRequestStatus | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<MembershipRequest | null>(null);
  
  const { data: requests = [], isLoading } = useMembershipRequests(tenantId, statusFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          Membership Requests
        </h3>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MembershipRequestStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requests.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            {statusFilter === 'pending' 
              ? 'No pending membership requests' 
              : 'No membership requests found'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={request.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {request.profile?.username?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {request.profile?.username || 'Unknown User'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {request.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.requested_at 
                      ? format(new Date(request.requested_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`gap-1 text-xs capitalize ${STATUS_STYLES[request.request_status]}`}
                    >
                      {STATUS_ICONS[request.request_status]}
                      {request.request_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      {request.request_status === 'pending' ? 'Review' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedRequest && (
        <MembershipReviewDialog
          request={selectedRequest}
          tenantId={tenantId}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
