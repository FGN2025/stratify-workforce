import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MediaPickerDialog } from './MediaPickerDialog';
import { Loader2, ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tenant, CategoryType, GameTitle } from '@/types/tenant';
import { CATEGORY_LABELS } from '@/types/tenant';
import type { Database } from '@/integrations/supabase/types';

type DBGameTitle = Database['public']['Enums']['game_title'];

const GAME_TITLE_OPTIONS: { value: DBGameTitle; label: string }[] = [
  { value: 'ATS', label: 'American Truck Simulator' },
  { value: 'Farming_Sim', label: 'Farming Simulator' },
  { value: 'Construction_Sim', label: 'Construction Simulator' },
  { value: 'Mechanic_Sim', label: 'Mechanic Simulator' },
];

interface CommunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: Tenant | null;
  allCommunities: Tenant[];
  onSave: () => void;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  category_type: CategoryType | null;
  brand_color: string;
  parent_tenant_id: string | null;
  hierarchy_level: number;
  game_titles: DBGameTitle[];
  logo_url: string;
  cover_image_url: string;
  location: string;
  website_url: string;
}

const defaultFormData: FormData = {
  name: '',
  slug: '',
  description: '',
  category_type: null,
  brand_color: '#3B82F6',
  parent_tenant_id: null,
  hierarchy_level: 0,
  game_titles: [],
  logo_url: '',
  cover_image_url: '',
  location: '',
  website_url: '',
};

export function CommunityFormDialog({
  open,
  onOpenChange,
  community,
  allCommunities,
  onSave,
}: CommunityFormDialogProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Available parent communities (exclude self and descendants)
  const availableParents = allCommunities.filter(t => {
    if (!community) return true;
    if (t.id === community.id) return false;
    // Prevent circular references
    let current = t;
    while (current.parent_tenant_id) {
      if (current.parent_tenant_id === community.id) return false;
      current = allCommunities.find(p => p.id === current.parent_tenant_id) || current;
      if (current.parent_tenant_id === current.id) break;
    }
    return true;
  });

  useEffect(() => {
    if (open) {
      if (community) {
        setFormData({
          name: community.name,
          slug: community.slug,
          description: community.description || '',
          category_type: community.category_type,
          brand_color: community.brand_color,
          parent_tenant_id: community.parent_tenant_id,
          hierarchy_level: community.hierarchy_level,
          game_titles: (community.game_titles as DBGameTitle[]) || [],
          logo_url: community.logo_url || '',
          cover_image_url: community.cover_image_url || '',
          location: community.location || '',
          website_url: community.website_url || '',
        });
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [community, open]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, name, slug: community ? formData.slug : slug });
  };

  // Calculate hierarchy level based on parent
  const handleParentChange = (parentId: string | null) => {
    let level = 0;
    if (parentId && parentId !== 'none') {
      const parent = allCommunities.find(t => t.id === parentId);
      level = (parent?.hierarchy_level ?? 0) + 1;
    }
    setFormData({
      ...formData,
      parent_tenant_id: parentId === 'none' ? null : parentId,
      hierarchy_level: level,
    });
  };

  const handleGameTitleToggle = (gameTitle: DBGameTitle) => {
    const current = formData.game_titles;
    const updated = current.includes(gameTitle)
      ? current.filter(g => g !== gameTitle)
      : [...current, gameTitle];
    setFormData({ ...formData, game_titles: updated });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Community name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Community slug is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const data = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        category_type: formData.category_type,
        brand_color: formData.brand_color,
        parent_tenant_id: formData.parent_tenant_id,
        hierarchy_level: formData.hierarchy_level,
        game_titles: formData.game_titles.length > 0 ? formData.game_titles : null,
        logo_url: formData.logo_url.trim() || null,
        cover_image_url: formData.cover_image_url.trim() || null,
        location: formData.location.trim() || null,
        website_url: formData.website_url.trim() || null,
      };

      if (community) {
        const { error } = await supabase
          .from('tenants')
          .update(data)
          .eq('id', community.id);

        if (error) throw error;

        toast({
          title: 'Community Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase.from('tenants').insert(data);

        if (error) throw error;

        toast({
          title: 'Community Created',
          description: `${formData.name} has been created successfully.`,
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving community:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save community.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {community ? 'Edit Community' : 'Create Community'}
            </DialogTitle>
            <DialogDescription>
              {community
                ? 'Update the community details below.'
                : 'Create a new training community for your organization.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name and Slug */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Community name"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  placeholder="community-slug"
                />
              </div>
            </div>

            {/* Category and Parent */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_type || undefined}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category_type: v as CategoryType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Parent Organization</Label>
                <Select
                  value={formData.parent_tenant_id || 'none'}
                  onValueChange={handleParentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {availableParents.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {'—'.repeat(t.hierarchy_level)} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Community description..."
                rows={3}
              />
            </div>

            {/* Game Titles */}
            <div className="space-y-3">
              <Label>Assigned Games</Label>
              <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  {GAME_TITLE_OPTIONS.map((game) => (
                    <div key={game.value} className="flex items-center gap-2">
                      <Checkbox
                        id={game.value}
                        checked={formData.game_titles.includes(game.value)}
                        onCheckedChange={() => handleGameTitleToggle(game.value)}
                      />
                      <label
                        htmlFor={game.value}
                        className="text-sm cursor-pointer"
                      >
                        {game.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Select the simulation games this community will use for training.
                </p>
              </div>
            </div>

            {/* Logo and Cover Image */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                  {formData.logo_url ? (
                    <div className="space-y-2">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted mx-auto">
                        <img
                          src={formData.logo_url}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowLogoPicker(true)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowLogoPicker(true)}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Logo
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                  {formData.cover_image_url ? (
                    <div className="space-y-2">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={formData.cover_image_url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowCoverPicker(true)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowCoverPicker(true)}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Cover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Color */}
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Location and Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, State"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {community ? 'Update Community' : 'Create Community'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={showLogoPicker}
        onOpenChange={setShowLogoPicker}
        onSelect={(url) => setFormData({ ...formData, logo_url: url })}
        title="Select Logo"
        currentImageUrl={formData.logo_url || undefined}
      />

      <MediaPickerDialog
        open={showCoverPicker}
        onOpenChange={setShowCoverPicker}
        onSelect={(url) => setFormData({ ...formData, cover_image_url: url })}
        title="Select Cover Image"
        currentImageUrl={formData.cover_image_url || undefined}
      />
    </>
  );
}
