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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Tractor, HardHat, Wrench } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type GameChannel = Database['public']['Tables']['game_channels']['Row'];
type GameTitle = Database['public']['Enums']['game_title'];

const allGameTitles: GameTitle[] = ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'];

const gameLabels: Record<GameTitle, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
};

const gameIcons: Record<GameTitle, React.ReactNode> = {
  ATS: <Truck className="h-4 w-4" />,
  Farming_Sim: <Tractor className="h-4 w-4" />,
  Construction_Sim: <HardHat className="h-4 w-4" />,
  Mechanic_Sim: <Wrench className="h-4 w-4" />,
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
  }, [channel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!isEditing && !gameTitle)) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        game_title: gameTitle as GameTitle,
        accent_color: accentColor,
        cover_image_url: coverImageUrl.trim() || null,
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

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL</Label>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim() || (!isEditing && !gameTitle)}
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
