import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Link, X } from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { cn } from '@/lib/utils';
import type { SiteMedia } from '@/hooks/useSiteMedia';

interface MediaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: SiteMedia | null;
}

const FOLDER_OPTIONS = [
  { value: 'heroes', label: 'Hero Images' },
  { value: 'covers', label: 'Cover Images' },
  { value: 'cards', label: 'Card Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio Files' },
  { value: 'misc', label: 'Miscellaneous' },
];

const MAX_FILE_SIZE_MB = 20;

export function MediaEditDialog({ open, onOpenChange, media }: MediaEditDialogProps) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [folder, setFolder] = useState('misc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateMedia, uploadFile } = useMediaLibrary();

  // Reset form when media changes
  useEffect(() => {
    if (media) {
      setUrl(media.url);
      setTitle(media.title);
      setAltText(media.alt_text || '');
      setMode('url');
      setFile(null);
      setPreviewUrl(null);
      // Set default folder based on media type
      if (media.media_type === 'video') {
        setFolder('videos');
      } else if (media.media_type === 'audio') {
        setFolder('audio');
      } else {
        setFolder('misc');
      }
    }
  }, [media]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  }, []);

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!media || !title) return;

    setIsSubmitting(true);

    try {
      let finalUrl = url;

      // If in upload mode and file is selected, upload first
      if (mode === 'upload' && file) {
        finalUrl = await uploadFile.mutateAsync({ file, folder });
      }

      await updateMedia.mutateAsync({
        id: media.id,
        url: finalUrl,
        title,
        alt_text: altText || undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating media:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the current preview image URL
  const getCurrentPreviewUrl = () => {
    if (mode === 'upload' && previewUrl) {
      return previewUrl;
    }
    return url;
  };

  // Check if YouTube media (hide upload tab for YouTube)
  const isYouTube = media?.media_type === 'youtube';

  // Check if submit is valid
  const isSubmitDisabled = () => {
    if (isSubmitting || !title) return true;
    if (mode === 'url' && !url) return true;
    if (mode === 'upload' && !file) return true;
    return false;
  };

  if (!media) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Media</DialogTitle>
          <DialogDescription>
            Update media details for "{media.location_key}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {media.media_type === 'image' && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={getCurrentPreviewUrl()}
                alt={altText || title}
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          {media.media_type === 'youtube' && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={`https://img.youtube.com/vi/${url.length === 11 ? url : url.split('/').pop()}/mqdefault.jpg`}
                alt={title}
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          {/* Mode Toggle - Hide for YouTube */}
          {!isYouTube && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link className="h-4 w-4" />
                  Enter URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 mt-4">
                {/* Drop Zone */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('edit-file-upload')?.click()}
                >
                  <input
                    id="edit-file-upload"
                    type="file"
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded" />
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 mt-1"
                          onClick={handleRemoveFile}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max {MAX_FILE_SIZE_MB}MB • JPG, PNG, WEBP, MP4, MP3
                      </p>
                    </>
                  )}
                </div>

                {/* Folder Selection */}
                {file && (
                  <div className="space-y-2">
                    <Label>Upload Folder</Label>
                    <Select value={folder} onValueChange={setFolder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-url">URL</Label>
                  <Input
                    id="edit-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* YouTube URL (shown only for YouTube media) */}
          {isYouTube && (
            <div className="space-y-2">
              <Label htmlFor="edit-url">YouTube Video ID</Label>
              <Input
                id="edit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Video ID"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Alt Text */}
          <div className="space-y-2">
            <Label htmlFor="edit-alt">Alt Text</Label>
            <Textarea
              id="edit-alt"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              rows={2}
              placeholder="Description for accessibility"
            />
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Location Key:</span>
              <span className="font-mono text-foreground">{media.location_key}</span>
              <span>Type:</span>
              <span className="text-foreground capitalize">{media.media_type}</span>
              <span>Status:</span>
              <span className="text-foreground">{media.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled()}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
