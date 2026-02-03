import { useState } from 'react';
import { format } from 'date-fns';
import { useCommunityReview, type CommunityReviewItem } from '@/hooks/useCommunityReview';
import { CommunityReviewDialog } from './CommunityReviewDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  RefreshCw,
  User,
  Inbox,
  Building2,
  Gamepad2,
} from 'lucide-react';
import type { CommunityApprovalStatus } from '@/types/tenant';
import { CATEGORY_LABELS } from '@/types/tenant';

const STATUS_OPTIONS: { value: CommunityApprovalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Communities' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_revision', label: 'Needs Revision' },
];

const STATUS_STYLES: Record<CommunityApprovalStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  needs_revision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function CommunityReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<CommunityApprovalStatus | 'all'>('pending');
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityReviewItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    communities,
    isLoading,
    isUpdating,
    refetch,
    approveCommunity,
    rejectCommunity,
    requestRevision,
    pendingCount,
  } = useCommunityReview({ statusFilter });

  const handleReview = (item: CommunityReviewItem) => {
    setSelectedCommunity(item);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Community Review Queue</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve community submissions
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as CommunityApprovalStatus | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {communities.length} communit{communities.length !== 1 ? 'ies' : 'y'}
      </p>

      {/* Table */}
      {communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-1">No communities found</h4>
          <p className="text-sm text-muted-foreground">
            {statusFilter === 'pending'
              ? 'All communities have been reviewed!'
              : 'No communities match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Community</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Games</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communities.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.logo_url || undefined} />
                        <AvatarFallback style={{ backgroundColor: item.brand_color }}>
                          <Building2 className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[180px]">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">@{item.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.owner_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[100px]">
                        {item.owner_profile?.username || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.category_type ? (
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[item.category_type]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.game_titles && item.game_titles.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Gamepad2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{item.game_titles.length}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.submitted_at
                      ? format(new Date(item.submitted_at), 'MMM d, h:mm a')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`capitalize ${STATUS_STYLES[item.approval_status]}`}
                    >
                      {item.approval_status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleReview(item)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Dialog */}
      <CommunityReviewDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        community={selectedCommunity}
        onApprove={approveCommunity}
        onReject={rejectCommunity}
        onRequestRevision={requestRevision}
        isUpdating={isUpdating}
      />
    </div>
  );
}
