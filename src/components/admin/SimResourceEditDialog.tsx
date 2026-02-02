import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import { 
  GraduationCap, 
  Briefcase, 
  Link, 
  BookOpen, 
  Video, 
  FileText, 
  Map,
  Truck,
  Tractor,
  HardHat,
  Wrench,
  Trophy,
  Target,
  Users
} from 'lucide-react';
import type { SimResource, SimResourceInsert } from '@/hooks/useSimResources';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

// Available icons for resources
const ICON_OPTIONS = [
  { value: 'graduation-cap', label: 'Graduation Cap', icon: GraduationCap },
  { value: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'link', label: 'Link', icon: Link },
  { value: 'book-open', label: 'Book', icon: BookOpen },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'file-text', label: 'Document', icon: FileText },
  { value: 'map', label: 'Map', icon: Map },
  { value: 'truck', label: 'Truck', icon: Truck },
  { value: 'tractor', label: 'Tractor', icon: Tractor },
  { value: 'hard-hat', label: 'Hard Hat', icon: HardHat },
  { value: 'wrench', label: 'Wrench', icon: Wrench },
  { value: 'trophy', label: 'Trophy', icon: Trophy },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'users', label: 'Users', icon: Users },
];

const GAME_OPTIONS: { value: GameTitle; label: string }[] = [
  { value: 'ATS', label: 'American Truck Simulator' },
  { value: 'Farming_Sim', label: 'Farming Simulator' },
  { value: 'Construction_Sim', label: 'Construction Simulator' },
  { value: 'Mechanic_Sim', label: 'Mechanic Simulator' },
];

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

interface SimResourceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: SimResource | null;
  onSave: (data: SimResourceInsert) => void;
  isLoading?: boolean;
}

export function SimResourceEditDialog({
  open,
  onOpenChange,
  resource,
  onSave,
  isLoading,
}: SimResourceEditDialogProps) {
  const isEditing = !!resource;

  const [formData, setFormData] = useState<SimResourceInsert>({
    game_title: 'ATS',
    title: '',
    description: '',
    href: '',
    icon_name: 'link',
    accent_color: '#3B82F6',
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resource) {
      setFormData({
        game_title: resource.game_title,
        title: resource.title,
        description: resource.description || '',
        href: resource.href,
        icon_name: resource.icon_name,
        accent_color: resource.accent_color,
        media_id: resource.media_id,
        is_active: resource.is_active,
      });
    } else {
      setFormData({
        game_title: 'ATS',
        title: '',
        description: '',
        href: '',
        icon_name: 'link',
        accent_color: '#3B82F6',
        is_active: true,
      });
    }
    setErrors({});
  }, [resource, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.href.trim()) {
      newErrors.href = 'URL is required';
    } else if (!formData.href.startsWith('http://') && !formData.href.startsWith('https://')) {
      newErrors.href = 'URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const SelectedIcon = ICON_OPTIONS.find(i => i.value === formData.icon_name)?.icon || Link;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit SIM Resource' : 'Add SIM Resource'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game Selection */}
          <div className="space-y-2">
            <Label htmlFor="game_title">Simulator Game</Label>
            <Select
              value={formData.game_title}
              onValueChange={(value: GameTitle) =>
                setFormData({ ...formData, game_title: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_OPTIONS.map((game) => (
                  <SelectItem key={game.value} value={game.value}>
                    {game.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., CDL Quest"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of this resource..."
              rows={2}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="href">URL</Label>
            <Input
              id="href"
              type="url"
              value={formData.href}
              onChange={(e) => setFormData({ ...formData, href: e.target.value })}
              placeholder="https://example.lovable.app"
            />
            {errors.href && (
              <p className="text-sm text-destructive">{errors.href}</p>
            )}
          </div>

          {/* Icon and Color Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) =>
                  setFormData({ ...formData, icon_name: value })
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="h-4 w-4" />
                      <span>
                        {ICON_OPTIONS.find((i) => i.value === formData.icon_name)?.label}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) =>
                    setFormData({ ...formData, accent_color: e.target.value })
                  }
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <div className="flex gap-1 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-6 h-6 rounded border border-border transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData({ ...formData, accent_color: color })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active (visible in sidebar)</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
