import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  X, 
  FileImage, 
  FileVideo, 
  FileText, 
  File,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  useUploadEvidence, 
  getAllowedMimeTypes,
  type EvidenceRequirements,
} from '@/hooks/useEvidenceSubmission';
import { cn } from '@/lib/utils';

interface EvidenceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  completionId: string;
  requirements: EvidenceRequirements;
  currentSubmissionCount: number;
  onUploadComplete?: () => void;
}

interface PendingFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function EvidenceUploadDialog({
  open,
  onOpenChange,
  workOrderId,
  completionId,
  requirements,
  currentSubmissionCount,
  onUploadComplete,
}: EvidenceUploadDialogProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const uploadEvidence = useUploadEvidence();

  const allowedMimeTypes = getAllowedMimeTypes(requirements.allowed_types);
  const remainingSlots = requirements.max_uploads - currentSubmissionCount;
  const canAddMore = remainingSlots > pendingFiles.length;

  const validateFile = useCallback((file: File): string | null => {
    if (!allowedMimeTypes.includes(file.type)) {
      return `File type not allowed. Accepted: ${requirements.allowed_types.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 50MB limit';
    }
    return null;
  }, [allowedMimeTypes, requirements.allowed_types]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const availableSlots = remainingSlots - pendingFiles.length;
    
    if (fileArray.length > availableSlots) {
      toast({
        title: 'Too many files',
        description: `You can only upload ${availableSlots} more file(s).`,
        variant: 'destructive',
      });
      return;
    }

    const newFiles: PendingFile[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: `Invalid file: ${file.name}`,
          description: error,
          variant: 'destructive',
        });
      } else {
        newFiles.push({ file, status: 'pending' });
      }
    }

    setPendingFiles(prev => [...prev, ...newFiles]);
  }, [remainingSlots, pendingFiles.length, validateFile]);

  const removeFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUploadAll = async () => {
    const pendingToUpload = pendingFiles.filter(f => f.status === 'pending');
    
    for (let i = 0; i < pendingToUpload.length; i++) {
      const pendingFile = pendingToUpload[i];
      const fileIndex = pendingFiles.findIndex(f => f === pendingFile);
      
      setPendingFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { ...f, status: 'uploading' } : f
      ));

      try {
        await uploadEvidence.mutateAsync({
          completionId,
          workOrderId,
          file: pendingFile.file,
        });

        setPendingFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: 'success' } : f
        ));
      } catch (error) {
        setPendingFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : f
        ));
      }
    }

    // Check if all succeeded
    const allSucceeded = pendingFiles.every(f => f.status === 'success' || f.status !== 'pending');
    if (allSucceeded) {
      toast({
        title: 'Evidence uploaded',
        description: 'Your evidence has been submitted for review.',
      });
      onUploadComplete?.();
      onOpenChange(false);
      setPendingFiles([]);
    }
  };

  const handleClose = () => {
    if (!uploadEvidence.isPending) {
      onOpenChange(false);
      setPendingFiles([]);
    }
  };

  const uploadedCount = pendingFiles.filter(f => f.status === 'success').length;
  const progress = pendingFiles.length > 0 
    ? (uploadedCount / pendingFiles.length) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Evidence</DialogTitle>
          <DialogDescription>
            {requirements.instructions || 'Upload files as evidence of work order completion.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requirements info */}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">
              {requirements.min_uploads}-{requirements.max_uploads} files required
            </Badge>
            <Badge variant="outline">
              Types: {requirements.allowed_types.join(', ')}
            </Badge>
            <Badge variant="outline">
              Max 50MB each
            </Badge>
          </div>

          {/* Progress indicator */}
          <div className="text-sm text-muted-foreground">
            {currentSubmissionCount + uploadedCount} of {requirements.min_uploads} minimum uploaded
            {currentSubmissionCount + uploadedCount >= requirements.min_uploads && (
              <CheckCircle2 className="inline h-4 w-4 ml-1 text-primary" />
            )}
          </div>

          {/* Drop zone */}
          {canAddMore && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById('evidence-file-input')?.click()}
              >
                Browse Files
              </Button>
              <input
                id="evidence-file-input"
                type="file"
                multiple
                accept={allowedMimeTypes.join(',')}
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
          )}

          {/* Pending files list */}
          {pendingFiles.length > 0 && (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {pendingFiles.map((pending, index) => {
                  const FileIcon = getFileIcon(pending.file.type);
                  return (
                    <div 
                      key={index}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        pending.status === 'error' && "border-destructive bg-destructive/5",
                        pending.status === 'success' && "border-primary bg-primary/5",
                      )}
                    >
                      <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pending.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(pending.file.size)}
                          {pending.status === 'uploading' && ' • Uploading...'}
                          {pending.status === 'success' && ' • Uploaded'}
                          {pending.status === 'error' && ` • ${pending.error}`}
                        </p>
                      </div>
                      {pending.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {pending.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                      {pending.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Upload progress */}
          {uploadEvidence.isPending && (
            <Progress value={progress} className="h-2" />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploadEvidence.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleUploadAll}
            disabled={pendingFiles.length === 0 || uploadEvidence.isPending}
          >
            {uploadEvidence.isPending ? 'Uploading...' : `Upload ${pendingFiles.length} File(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
