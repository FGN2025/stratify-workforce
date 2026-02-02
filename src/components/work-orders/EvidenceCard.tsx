import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileImage, 
  FileVideo, 
  FileText, 
  File, 
  Trash2, 
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import type { EvidenceSubmission } from '@/hooks/useEvidenceSubmission';

interface EvidenceCardProps {
  evidence: EvidenceSubmission;
  onDelete?: (evidence: EvidenceSubmission) => void;
  isDeleting?: boolean;
  showReviewStatus?: boolean;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusConfig(status: EvidenceSubmission['review_status']) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending Review',
        icon: Clock,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
      };
    case 'approved':
      return {
        label: 'Approved',
        icon: CheckCircle2,
        variant: 'default' as const,
        className: 'bg-primary/20 text-primary border-primary/30',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        icon: XCircle,
        variant: 'destructive' as const,
        className: '',
      };
    case 'needs_revision':
      return {
        label: 'Needs Revision',
        icon: AlertCircle,
        variant: 'outline' as const,
        className: 'border-amber-500 text-amber-500',
      };
  }
}

export function EvidenceCard({ 
  evidence, 
  onDelete, 
  isDeleting,
  showReviewStatus = true,
}: EvidenceCardProps) {
  const FileIcon = getFileIcon(evidence.file_type);
  const statusConfig = getStatusConfig(evidence.review_status);
  const StatusIcon = statusConfig.icon;
  const canDelete = evidence.review_status === 'pending' || evidence.review_status === 'needs_revision';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* File preview/icon */}
          <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {evidence.file_type.startsWith('image/') ? (
              <img 
                src={evidence.file_url} 
                alt={evidence.file_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" title={evidence.file_name}>
              {evidence.file_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(evidence.file_size)} • {format(new Date(evidence.uploaded_at), 'MMM d, yyyy')}
            </p>
            
            {showReviewStatus && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={statusConfig.variant} className={statusConfig.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
            )}

            {evidence.reviewer_notes && (
              <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                <span className="font-medium">Reviewer notes:</span> {evidence.reviewer_notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              asChild
            >
              <a href={evidence.file_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            
            {onDelete && canDelete && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onDelete(evidence)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
