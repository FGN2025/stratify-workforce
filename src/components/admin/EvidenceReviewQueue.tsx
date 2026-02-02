import { useState } from 'react';
import { format } from 'date-fns';
import { useEvidenceReview, type EvidenceItem } from '@/hooks/useEvidenceReview';
import { EvidenceReviewDialog } from './EvidenceReviewDialog';
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
  FileImage,
  FileVideo,
  FileText,
  Eye,
  RefreshCw,
  User,
  Inbox,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type EvidenceReviewStatus = Database['public']['Enums']['evidence_review_status'];

const STATUS_OPTIONS: { value: EvidenceReviewStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Submissions' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_revision', label: 'Needs Revision' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  needs_revision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.startsWith('video/')) return FileVideo;
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<EvidenceReviewStatus | 'all'>('pending');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    evidence,
    isLoading,
    isUpdating,
    refetch,
    approveEvidence,
    rejectEvidence,
    requestRevision,
    pendingCount,
  } = useEvidenceReview({ statusFilter });

  const handleReview = (item: EvidenceItem) => {
    setSelectedEvidence(item);
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
          <h3 className="text-lg font-semibold">Evidence Review Queue</h3>
          <p className="text-sm text-muted-foreground">
            Review submitted evidence for work order completions
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
          onValueChange={(v) => setStatusFilter(v as EvidenceReviewStatus | 'all')}
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
        {evidence.length} submission{evidence.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      {evidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-1">No submissions found</h4>
          <p className="text-sm text-muted-foreground">
            {statusFilter === 'pending'
              ? 'All evidence has been reviewed!'
              : 'No evidence matches the current filter.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((item) => {
                const FileIcon = getFileIcon(item.file_type);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.user_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[120px]">
                          {item.user_profile?.username || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">{item.work_order?.title || '—'}</p>
                        {item.work_order?.game_title && (
                          <p className="text-xs text-muted-foreground">
                            {item.work_order.game_title.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate max-w-[150px]">{item.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(item.file_size)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(item.uploaded_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_STYLES[item.review_status]}`}
                      >
                        {item.review_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleReview(item)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Dialog */}
      <EvidenceReviewDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        evidence={selectedEvidence}
        onApprove={approveEvidence}
        onReject={rejectEvidence}
        onRequestRevision={requestRevision}
        isUpdating={isUpdating}
      />
    </div>
  );
}
