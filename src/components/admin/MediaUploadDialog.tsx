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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Link, Youtube, Loader2, X, Image } from 'lucide-react';
import { useMediaLibrary, extractYouTubeId, getYouTubeThumbnail } from '@/hooks/useMediaLibrary';
import { cn } from '@/lib/utils';

interface MediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLocationKeys: string[];
}

type UploadMode = 'upload' | 'url' | 'youtube';

const LOCATION_KEY_OPTIONS = [
  { value: 'home_hero_image', label: 'Home Hero Background' },
  { value: 'leaderboard_hero', label: 'Leaderboard Hero Background' },
  { value: 'profile_hero', label: 'Profile Hero Background' },
  { value: 'students_hero', label: 'Students Hero Background' },
  { value: 'work_orders_hero', label: 'Work Orders Hero Background' },
  { value: 'ats_cover', label: 'ATS Cover Image' },
  { value: 'farming_sim_cover', label: 'Farming Sim Cover Image' },
  { value: 'construction_sim_cover', label: 'Construction Sim Cover Image' },
  { value: 'mechanic_sim_cover', label: 'Mechanic Sim Cover Image' },
  { value: 'promo_video_1', label: 'Promotional Video 1' },
  { value: 'custom', label: 'Custom Location Key' },
];

const FOLDER_OPTIONS = [
  { value: 'heroes', label: 'Hero Images' },
  { value: 'covers', label: 'Cover Images' },
  { value: 'cards', label: 'Card Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio Files' },
  { value: 'misc', label: 'Miscellaneous' },
];

export function MediaUploadDialog({ open, onOpenChange, existingLocationKeys }: MediaUploadDialogProps) {
  const [mode, setMode] = useState<UploadMode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [locationKey, setLocationKey] = useState('');
  const [customLocationKey, setCustomLocationKey] = useState('');
  const [folder, setFolder] = useState('heroes');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile, createMedia } = useMediaLibrary();

  const resetForm = useCallback(() => {
    setMode('upload');
    setFile(null);
    setPreviewUrl(null);
    setUrl('');
    setYoutubeUrl('');
    setLocationKey('');
    setCustomLocationKey('');
    setFolder('heroes');
    setTitle('');
    setAltText('');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTitle(selectedFile.name.split('.')[0]);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setTitle(droppedFile.name.split('.')[0]);
      
      if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(droppedFile);
      }
    }
  }, []);

  const getYouTubePreview = () => {
    const videoId = extractYouTubeId(youtubeUrl);
    return videoId ? getYouTubeThumbnail(videoId) : null;
  };

  const handleSubmit = async () => {
    const finalLocationKey = locationKey === 'custom' ? customLocationKey : locationKey;
    
    if (!finalLocationKey || !title) {
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUrl = '';
      let mediaType: 'image' | 'video' | 'youtube' | 'audio' = 'image';

      if (mode === 'upload' && file) {
        finalUrl = await uploadFile.mutateAsync({ file, folder });
        mediaType = file.type.startsWith('video/') ? 'video' : 
                   file.type.startsWith('audio/') ? 'audio' : 'image';
      } else if (mode === 'url') {
        finalUrl = url;
        // Try to determine type from URL
        if (url.match(/\.(mp4|webm|mov)$/i)) {
          mediaType = 'video';
        } else if (url.match(/\.(mp3|wav|ogg)$/i)) {
          mediaType = 'audio';
        }
      } else if (mode === 'youtube') {
        const videoId = extractYouTubeId(youtubeUrl);
        if (!videoId) throw new Error('Invalid YouTube URL');
        finalUrl = videoId;
        mediaType = 'youtube';
      }

      await createMedia.mutateAsync({
        location_key: finalLocationKey,
        media_type: mediaType,
        url: finalUrl,
        title,
        alt_text: altText || undefined,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating media:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocationKeyUsed = (key: string) => existingLocationKeys.includes(key);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Media</DialogTitle>
          <DialogDescription>
            Upload a file, enter a URL, or add a YouTube video.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('upload')}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button
            variant={mode === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('url')}
            className="gap-2"
          >
            <Link className="h-4 w-4" />
            URL
          </Button>
          <Button
            variant={mode === 'youtube' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('youtube')}
            className="gap-2"
          >
            <Youtube className="h-4 w-4" />
            YouTube
          </Button>
        </div>

        <div className="space-y-4">
          {/* Upload Mode */}
          {mode === 'upload' && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded" />
                  ) : (
                    <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
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
                    JPG, PNG, WEBP, MP4, MP3 supported
                  </p>
                </>
              )}
            </div>
          )}

          {mode === 'upload' && file && (
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

          {/* URL Mode */}
          {mode === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="url">Image/Video URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {url && url.match(/\.(jpg|jpeg|png|webp|gif)$/i) && (
                <div className="mt-2 rounded overflow-hidden border">
                  <img src={url} alt="Preview" className="w-full h-32 object-cover" />
                </div>
              )}
            </div>
          )}

          {/* YouTube Mode */}
          {mode === 'youtube' && (
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube URL</Label>
              <Input
                id="youtube"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              {getYouTubePreview() && (
                <div className="mt-2 rounded overflow-hidden border relative">
                  <img 
                    src={getYouTubePreview()!} 
                    alt="YouTube Preview" 
                    className="w-full h-32 object-cover" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="bg-red-600 rounded-full p-3">
                      <Youtube className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location Key */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationKey} onValueChange={setLocationKey}>
              <SelectTrigger>
                <SelectValue placeholder="Where will this be used?" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_KEY_OPTIONS.map((opt) => (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    disabled={opt.value !== 'custom' && isLocationKeyUsed(opt.value)}
                  >
                    {opt.label}
                    {opt.value !== 'custom' && isLocationKeyUsed(opt.value) && ' (in use)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {locationKey === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customKey">Custom Location Key</Label>
              <Input
                id="customKey"
                placeholder="my_custom_image"
                value={customLocationKey}
                onChange={(e) => setCustomLocationKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              />
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, and underscores only
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Media title for admin reference"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Alt Text */}
          <div className="space-y-2">
            <Label htmlFor="altText">Alt Text (optional)</Label>
            <Textarea
              id="altText"
              placeholder="Description for accessibility"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !title ||
              (!locationKey || (locationKey === 'custom' && !customLocationKey)) ||
              (mode === 'upload' && !file) ||
              (mode === 'url' && !url) ||
              (mode === 'youtube' && !extractYouTubeId(youtubeUrl))
            }
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Media
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
