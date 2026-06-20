import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, FolderOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MediaPickerDialog } from './MediaPickerDialog';

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  variant?: 'logo' | 'cover';
  folder?: string;
  workOrderId?: string;
  placeholder?: string;
}

/**
 * Inline image field with drag-and-drop upload, file picker, URL input,
 * and library/AI browser via MediaPickerDialog. Uploads go to the
 * media-assets bucket through useMediaLibrary.
 */
export function ImageField({
  value,
  onChange,
  label,
  variant = 'cover',
  folder = 'community',
  workOrderId,
  placeholder = 'https://…',
}: ImageFieldProps) {
  const { uploadFile } = useMediaLibrary();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Unsupported file',
          description: 'Please drop an image file.',
          variant: 'destructive',
        });
        return;
      }
      try {
        const url = await uploadFile.mutateAsync({ file, folder });
        onChange(url);
      } catch (e) {
        // toast already shown by hook
      }
    },
    [uploadFile, folder, onChange, toast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const aspectClass = variant === 'logo' ? 'aspect-square w-32' : 'aspect-video w-full';
  const isUploading = uploadFile.isPending;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !value && !isUploading && fileInputRef.current?.click()}
          className={cn(
            'relative overflow-hidden rounded-md border border-dashed border-border bg-muted/30 transition-colors',
            aspectClass,
            isDragging && 'border-primary bg-primary/10',
            !value && !isUploading && 'cursor-pointer hover:border-primary/60',
          )}
        >
          {value ? (
            <>
              <img
                src={value}
                alt={label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
              <span>Drag & drop or click to upload</span>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            disabled={isUploading}
          >
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            Browse library
          </Button>
        </div>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => onChange(url)}
        title={`Select ${label}`}
        currentImageUrl={value}
        workOrderId={workOrderId}
      />
    </div>
  );
}
