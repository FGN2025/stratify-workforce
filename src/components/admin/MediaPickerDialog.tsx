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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Link, Image, Loader2, X, Check } from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useAllSiteMedia } from '@/hooks/useSiteMedia';
import { cn } from '@/lib/utils';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
  currentImageUrl?: string;
}

/**
 * A combined dialog for selecting images via upload, URL, or existing library.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Image',
  currentImageUrl,
}: MediaPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'library'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [urlPreviewError, setUrlPreviewError] = useState(false);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile } = useMediaLibrary();
  const { data: allMedia, isLoading: isLoadingMedia } = useAllSiteMedia();

  // Filter to only image type media
  const imageMedia = allMedia?.filter((m) => m.media_type === 'image') || [];

  const resetForm = useCallback(() => {
    setActiveTab('upload');
    setFile(null);
    setPreviewUrl(null);
    setUrl('');
    setUrlPreviewError(false);
    setSelectedLibraryUrl(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(droppedFile);
    }
  }, []);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setUrlPreviewError(false);
  };

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return urlString.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i) || 
             urlString.includes('unsplash.com') ||
             urlString.includes('images.') ||
             urlString.includes('/image');
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let finalUrl = '';

      if (activeTab === 'upload' && file) {
        finalUrl = await uploadFile.mutateAsync({ file, folder: 'cards' });
      } else if (activeTab === 'url' && url) {
        finalUrl = url;
      } else if (activeTab === 'library' && selectedLibraryUrl) {
        finalUrl = selectedLibraryUrl;
      }

      if (finalUrl) {
        onSelect(finalUrl);
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error selecting media:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    if (activeTab === 'upload') return !!file;
    if (activeTab === 'url') return !!url && isValidUrl(url);
    if (activeTab === 'library') return !!selectedLibraryUrl;
    return false;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Upload a new image, enter a URL, or select from the media library.
          </DialogDescription>
        </DialogHeader>

        {/* Current Image Preview */}
        {currentImageUrl && (
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Current Image</Label>
            <div className="h-20 w-32 rounded border overflow-hidden">
              <img
                src={currentImageUrl}
                alt="Current"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Image className="h-4 w-4" />
              Library
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('media-picker-upload')?.click()}
            >
              <input
                id="media-picker-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="h-24 w-24 object-cover rounded" />
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WEBP, GIF supported (max 20MB)
                  </p>
                </>
              )}
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
            </div>

            {url && isValidUrl(url) && (
              <div className="rounded border overflow-hidden">
                <img
                  src={url}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={() => setUrlPreviewError(true)}
                />
                {urlPreviewError && (
                  <div className="p-2 bg-destructive/10 text-destructive text-xs text-center">
                    Could not load image preview
                  </div>
                )}
              </div>
            )}

            {url && !isValidUrl(url) && (
              <p className="text-xs text-muted-foreground">
                Enter a valid image URL (jpg, png, webp, gif)
              </p>
            )}
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="mt-4">
            {isLoadingMedia ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : imageMedia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No images in the media library</p>
                <p className="text-xs">Upload an image or enter a URL instead</p>
              </div>
            ) : (
              <ScrollArea className="h-[240px]">
                <div className="grid grid-cols-3 gap-2 p-1">
                  {imageMedia.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => setSelectedLibraryUrl(media.url)}
                      className={cn(
                        'relative aspect-video rounded border overflow-hidden transition-all',
                        'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
                        selectedLibraryUrl === media.url
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border'
                      )}
                    >
                      <img
                        src={media.url}
                        alt={media.alt_text || media.title}
                        className="w-full h-full object-cover"
                      />
                      {selectedLibraryUrl === media.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-1">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                        <p className="text-[10px] text-white truncate">{media.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit()}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Select Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
