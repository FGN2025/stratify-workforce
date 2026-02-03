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
  ExternalLink,
  Loader2,
  User,
  Building2,
  MapPin,
  Globe,
  Gamepad2,
} from 'lucide-react';
import type { CommunityReviewItem } from '@/hooks/useCommunityReview';
import { CATEGORY_LABELS } from '@/types/tenant';

interface CommunityReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: CommunityReviewItem | null;
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

const GAME_TITLE_LABELS: Record<string, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
};

export function CommunityReviewDialog({
  open,
  onOpenChange,
  community,
  onApprove,
  onReject,
  onRequestRevision,
  isUpdating,
}: CommunityReviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'revision' | null>(null);

  if (!community) return null;

  const handleAction = async () => {
    if (!confirmAction) return;

    let success = false;
    switch (confirmAction) {
      case 'approve':
        success = await onApprove(community.id, notes.trim() || undefined);
        break;
      case 'reject':
        success = await onReject(community.id, notes.trim());
        break;
      case 'revision':
        success = await onRequestRevision(community.id, notes.trim());
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
            <DialogTitle>Review Community Submission</DialogTitle>
            <DialogDescription>
              Review the community details and decide whether to approve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Hero Preview */}
            <div className="relative rounded-lg overflow-hidden">
              <div 
                className="h-32 w-full bg-cover bg-center"
                style={{ 
                  backgroundColor: community.brand_color,
                  backgroundImage: community.cover_image_url ? `url(${community.cover_image_url})` : undefined,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-background">
                  <AvatarImage src={community.logo_url || undefined} />
                  <AvatarFallback style={{ backgroundColor: community.brand_color }}>
                    <Building2 className="h-6 w-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">{community.name}</h3>
                  <p className="text-sm text-muted-foreground">@{community.slug}</p>
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className={STATUS_STYLES[community.approval_status]}>
                  {community.approval_status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Submitter Info */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={community.owner_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {community.owner_profile?.username || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted {community.submitted_at
                      ? format(new Date(community.submitted_at), 'MMM d, yyyy h:mm a')
                      : 'Unknown date'}
                  </p>
                </div>
              </div>
            </div>

            {/* Community Details */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <Label className="text-muted-foreground">Category</Label>
                <p className="font-medium">
                  {community.category_type ? CATEGORY_LABELS[community.category_type] : 'Not specified'}
                </p>
              </div>

              {/* Location */}
              {community.location && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p>{community.location}</p>
                  </div>
                </div>
              )}

              {/* Website */}
              {community.website_url && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Website</Label>
                  <a 
                    href={community.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {community.website_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Games */}
              {community.game_titles && community.game_titles.length > 0 && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-muted-foreground">Assigned Games</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                    {community.game_titles.map((game) => (
                      <Badge key={game} variant="secondary">
                        {GAME_TITLE_LABELS[game] || game}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {community.description && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Description</Label>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{community.description}</p>
                </div>
              </div>
            )}

            {/* Previous Review Notes */}
            {community.reviewer_notes && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Previous Review Notes</Label>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                  <p className="text-sm">{community.reviewer_notes}</p>
                  {community.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed {format(new Date(community.reviewed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Review Notes Input */}
            <div className="space-y-2">
              <Label htmlFor="review-notes">
                Review Notes
                {community.approval_status === 'pending' && (
                  <span className="text-muted-foreground ml-1">(required for reject/revision)</span>
                )}
              </Label>
              <Textarea
                id="review-notes"
                placeholder="Add notes about this community submission..."
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
              {confirmAction === 'approve' && 'Approve Community?'}
              {confirmAction === 'reject' && 'Reject Community?'}
              {confirmAction === 'revision' && 'Request Revision?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve' &&
                'This will make the community publicly visible. It will also be marked as verified.'}
              {confirmAction === 'reject' &&
                'This will reject the community submission. The creator will see your feedback.'}
              {confirmAction === 'revision' &&
                'This will request the creator to revise and resubmit their community details.'}
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
