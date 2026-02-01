import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { SiteMedia } from '@/hooks/useSiteMedia';

interface MediaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: SiteMedia | null;
}

export function MediaEditDialog({ open, onOpenChange, media }: MediaEditDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateMedia } = useMediaLibrary();

  useEffect(() => {
    if (media) {
      setUrl(media.url);
      setTitle(media.title);
      setAltText(media.alt_text || '');
    }
  }, [media]);

  const handleSubmit = async () => {
    if (!media || !title) return;

    setIsSubmitting(true);

    try {
      await updateMedia.mutateAsync({
        id: media.id,
        url,
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
                src={url}
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

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-url">
              {media.media_type === 'youtube' ? 'YouTube Video ID' : 'URL'}
            </Label>
            <Input
              id="edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={media.media_type === 'youtube' ? 'Video ID' : 'https://...'}
            />
          </div>

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
          <Button onClick={handleSubmit} disabled={isSubmitting || !title || !url}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
