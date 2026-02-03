import { useState, useEffect, useRef } from 'react';
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
import { Truck, Tractor, HardHat, Wrench, Cable, Upload, Link, X, Loader2 } from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { Database } from '@/integrations/supabase/types';

type GameChannel = Database['public']['Tables']['game_channels']['Row'];
type GameTitle = Database['public']['Enums']['game_title'];

const allGameTitles: GameTitle[] = ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim', 'Fiber_Tech'];

const gameLabels: Record<GameTitle, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
  Fiber_Tech: 'Fiber-Tech Simulator',
};

const gameIcons: Record<GameTitle, React.ReactNode> = {
  ATS: <Truck className="h-4 w-4" />,
  Farming_Sim: <Tractor className="h-4 w-4" />,
  Construction_Sim: <HardHat className="h-4 w-4" />,
  Mechanic_Sim: <Wrench className="h-4 w-4" />,
  Fiber_Tech: <Cable className="h-4 w-4" />,
};

interface SimGameEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: GameChannel | null;
  existingGameTitles: GameTitle[];
  onSave: (data: Partial<GameChannel>) => Promise<void>;
}

export function SimGameEditDialog({
  open,
  onOpenChange,
  channel,
  existingGameTitles,
  onSave,
}: SimGameEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gameTitle, setGameTitle] = useState<GameTitle | ''>('');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Upload mode states
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile } = useMediaLibrary();

  const isEditing = !!channel;

  // Available game titles (exclude already used ones when creating)
  const availableGameTitles = isEditing 
    ? allGameTitles 
    : allGameTitles.filter(gt => !existingGameTitles.includes(gt));

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description || '');
      setGameTitle(channel.game_title);
      setAccentColor(channel.accent_color);
      setCoverImageUrl(channel.cover_image_url || '');
    } else {
      setName('');
      setDescription('');
      setGameTitle('');
      setAccentColor('#10b981');
      setCoverImageUrl('');
    }
    // Reset upload state when dialog opens
    setUploadMode('url');
    setFile(null);
    setPreviewUrl(null);
    setIsDragging(false);
  }, [channel, open]);

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      return;
    }
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!isEditing && !gameTitle)) return;

    setIsSaving(true);
    try {
      let finalCoverUrl = coverImageUrl.trim() || null;
      
      // If in upload mode with a file, upload first
      if (uploadMode === 'upload' && file) {
        finalCoverUrl = await uploadFile.mutateAsync({
          file,
          folder: 'game-covers'
        });
      }
      
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        game_title: gameTitle as GameTitle,
        accent_color: accentColor,
        cover_image_url: finalCoverUrl,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Game Channel' : 'Add Game Channel'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the game channel details and description.'
              : 'Create a new simulation game channel for skill tracking.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game Title (only for new channels) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="gameTitle">Simulation Game *</Label>
              <Select
                value={gameTitle}
                onValueChange={(value) => {
                  setGameTitle(value as GameTitle);
                  if (!name) {
                    setName(gameLabels[value as GameTitle]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {availableGameTitles.map((gt) => (
                    <SelectItem key={gt} value={gt}>
                      <div className="flex items-center gap-2">
                        {gameIcons[gt]}
                        <span>{gameLabels[gt]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableGameTitles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  All game titles already have channels configured.
                </p>
              )}
            </div>
          )}

          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., American Truck Simulator"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the skills and challenges available in this simulation..."
              rows={4}
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label htmlFor="accentColor">Brand Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="accentColor"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#10b981"
                className="flex-1"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            
            {/* Mode Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  uploadMode === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Link className="h-4 w-4" />
                URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  uploadMode === 'upload'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
            </div>

            {/* URL Mode */}
            {uploadMode === 'url' && (
              <div className="space-y-2">
                <Input
                  id="coverImage"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                {coverImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border">
                    <img 
                      src={coverImageUrl} 
                      alt="Cover preview"
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Upload Mode */}
            {uploadMode === 'upload' && (
              <div className="space-y-2">
                {!file ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/20'
                    }`}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      JPG, PNG, WEBP supported
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFileSelect(selectedFile);
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={previewUrl || ''}
                      alt="Upload preview"
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-background/80 text-xs">
                      {file.name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim() || (!isEditing && !gameTitle)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadFile.isPending ? 'Uploading...' : 'Saving...'}
                </>
              ) : isEditing ? 'Save Changes' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
