import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ExternalLink,
  FileImage,
  FileVideo,
  FileText,
  Loader2,
  User,
} from 'lucide-react';
import type { EvidenceItem } from '@/hooks/useEvidenceReview';

interface EvidenceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: EvidenceItem | null;
  onApprove: (id: string, notes?: string) => Promise<boolean>;
  onReject: (id: string, notes: string) => Promise<boolean>;
  onRequestRevision: (id: string, notes: string) => Promise<boolean>;
  isUpdating: boolean;
}

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

export function EvidenceReviewDialog({
  open,
  onOpenChange,
  evidence,
  onApprove,
  onReject,
  onRequestRevision,
  isUpdating,
}: EvidenceReviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'revision' | null>(null);

  if (!evidence) return null;

  const FileIcon = getFileIcon(evidence.file_type);
  const isImage = evidence.file_type.startsWith('image/');
  const isVideo = evidence.file_type.startsWith('video/');

  const handleAction = async () => {
    if (!confirmAction) return;

    let success = false;
    switch (confirmAction) {
      case 'approve':
        success = await onApprove(evidence.id, notes.trim() || undefined);
        break;
      case 'reject':
        success = await onReject(evidence.id, notes.trim());
        break;
      case 'revision':
        success = await onRequestRevision(evidence.id, notes.trim());
        break;
    }

    if (success) {
      setNotes('');
      setConfirmAction(null);
      onOpenChange(false);
    }
  };

  const openConfirmDialog = (action: 'approve' | 'reject' | 'revision') => {
    if ((action === 'reject' || action === 'revision') && !notes.trim()) {
      return; // Notes required for reject/revision
    }
    setConfirmAction(action);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Evidence Submission</DialogTitle>
            <DialogDescription>
              Review the uploaded evidence and provide feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User and Work Order Info */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={evidence.user_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {evidence.user_profile?.username || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted {format(new Date(evidence.uploaded_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={STATUS_STYLES[evidence.review_status]}>
                {evidence.review_status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Work Order */}
            {evidence.work_order && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Work Order</Label>
                <p className="font-medium">{evidence.work_order.title}</p>
                <Badge variant="secondary" className="text-xs">
                  {evidence.work_order.game_title.replace('_', ' ')}
                </Badge>
              </div>
            )}

            {/* File Preview */}
            <div className="space-y-3">
              <Label>Submitted File</Label>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                {isImage && (
                  <div className="relative aspect-video bg-muted flex items-center justify-center">
                    <img
                      src={evidence.file_url}
                      alt={evidence.file_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                {isVideo && (
                  <div className="aspect-video bg-muted">
                    <video
                      src={evidence.file_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                {!isImage && !isVideo && (
                  <div className="p-8 flex flex-col items-center justify-center gap-3 bg-muted/50">
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Preview not available</p>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between border-t border-border/50 bg-background">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {evidence.file_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(evidence.file_size)})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={evidence.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={evidence.file_url} download={evidence.file_name}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous Review Notes */}
            {evidence.reviewer_notes && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Previous Review Notes</Label>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                  <p className="text-sm">{evidence.reviewer_notes}</p>
                  {evidence.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed {format(new Date(evidence.reviewed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Review Notes Input */}
            <div className="space-y-2">
              <Label htmlFor="review-notes">
                Review Notes
                {evidence.review_status === 'pending' && (
                  <span className="text-muted-foreground ml-1">(required for reject/revision)</span>
                )}
              </Label>
              <Textarea
                id="review-notes"
                placeholder="Add notes about this submission..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => openConfirmDialog('revision')}
              disabled={isUpdating || !notes.trim()}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Revision
            </Button>
            <Button
              variant="destructive"
              onClick={() => openConfirmDialog('reject')}
              disabled={isUpdating || !notes.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => openConfirmDialog('approve')}
              disabled={isUpdating}
              variant="default"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' && 'Approve Evidence?'}
              {confirmAction === 'reject' && 'Reject Evidence?'}
              {confirmAction === 'revision' && 'Request Revision?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve' &&
                'This will mark the evidence as approved. The user will be notified.'}
              {confirmAction === 'reject' &&
                'This will reject the evidence submission. The user will see your feedback.'}
              {confirmAction === 'revision' &&
                'This will request the user to revise and resubmit their evidence.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isUpdating}
              className={
                confirmAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : confirmAction === 'reject'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
