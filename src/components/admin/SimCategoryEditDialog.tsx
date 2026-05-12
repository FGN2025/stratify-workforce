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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { ICON_OPTIONS, getIconByKey } from '@/lib/sim-icons';
import type { SimCategory, SimDeepDiveResource } from '@/hooks/useSimCategories';
import type { GameTitle } from '@/types/tenant';

const ALL_GAMES: GameTitle[] = ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim', 'Fiber_Tech', 'Roadcraft'];

const GAME_LABELS: Record<GameTitle, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
  Fiber_Tech: 'Fiber-Tech Simulator',
  Roadcraft: 'Roadcraft',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: SimCategory | null;
  onSave: (data: Partial<SimCategory>) => Promise<void>;
}

const emptyResource = (): SimDeepDiveResource => ({
  key: `r${Date.now()}`,
  title: '',
  description: '',
  href: '',
  accentColor: '#8B5CF6',
  iconKey: 'graduation-cap',
  ctaLabel: '',
});

export function SimCategoryEditDialog({ open, onOpenChange, category, onSave }: Props) {
  const isEditing = !!category;
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [iconKey, setIconKey] = useState('target');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [defaultGames, setDefaultGames] = useState<GameTitle[]>([]);
  const [resources, setResources] = useState<SimDeepDiveResource[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(category?.key ?? '');
    setTitle(category?.title ?? '');
    setSubtitle(category?.subtitle ?? '');
    setIconKey(category?.icon_key ?? 'target');
    setAccentColor(category?.accent_color ?? '#F59E0B');
    setDisplayOrder(category?.display_order ?? 0);
    setDefaultGames(category?.default_game_titles ?? []);
    setResources(category?.deep_dive_resources ?? []);
    setIsActive(category?.is_active ?? true);
  }, [open, category]);

  const toggleGame = (g: GameTitle) => {
    setDefaultGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const updateResource = (idx: number, patch: Partial<SimDeepDiveResource>) => {
    setResources((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !key.trim()) return;
    setSaving(true);
    try {
      await onSave({
        key: key.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        icon_key: iconKey,
        accent_color: accentColor,
        display_order: displayOrder,
        default_game_titles: defaultGames,
        deep_dive_resources: resources.filter((r) => r.title.trim() && r.href.trim()),
        is_active: isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            Configure a SIM category, its default games, and Deep Dive resources.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-key">Key *</Label>
              <Input
                id="cat-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                disabled={isEditing}
                placeholder="trucking"
                required
              />
              <p className="text-xs text-muted-foreground">Stable identifier — cannot change once set.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input id="cat-order" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-title">Title *</Label>
            <Input id="cat-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-sub">Subtitle</Label>
            <Input id="cat-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Shown under the section title" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={iconKey} onValueChange={setIconKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((o) => {
                    const I = o.icon;
                    return (
                      <SelectItem key={o.key} value={o.key}>
                        <div className="flex items-center gap-2"><I className="h-4 w-4" />{o.label}</div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-16 h-10 p-1" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default SIM Games (rows with these games auto-show in this category)</Label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-md border border-border/50 bg-muted/20">
              {ALL_GAMES.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={defaultGames.includes(g)} onCheckedChange={() => toggleGame(g)} />
                  {GAME_LABELS[g]}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Deep Dive Resources</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setResources([...resources, emptyResource()])}>
                <Plus className="h-3 w-3 mr-1" /> Add Resource
              </Button>
            </div>
            {resources.length === 0 && (
              <p className="text-xs text-muted-foreground">No deep-dive cards. These show below the category carousel.</p>
            )}
            {resources.map((r, idx) => {
              const I = getIconByKey(r.iconKey);
              return (
                <div key={idx} className="rounded-md border border-border/50 p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium"><I className="h-4 w-4" style={{ color: r.accentColor }} />Resource #{idx + 1}</div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setResources(resources.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Title" value={r.title} onChange={(e) => updateResource(idx, { title: e.target.value })} />
                    <Input placeholder="CTA label (e.g. Start Training)" value={r.ctaLabel ?? ''} onChange={(e) => updateResource(idx, { ctaLabel: e.target.value })} />
                  </div>
                  <Textarea placeholder="Description" value={r.description} onChange={(e) => updateResource(idx, { description: e.target.value })} rows={2} />
                  <Input placeholder="https://…" value={r.href} onChange={(e) => updateResource(idx, { href: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={r.iconKey} onValueChange={(v) => updateResource(idx, { iconKey: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((o) => {
                          const Ic = o.icon;
                          return <SelectItem key={o.key} value={o.key}><div className="flex items-center gap-2"><Ic className="h-4 w-4" />{o.label}</div></SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input type="color" value={r.accentColor} onChange={(e) => updateResource(idx, { accentColor: e.target.value })} className="w-14 h-9 p-1" />
                      <Input value={r.accentColor} onChange={(e) => updateResource(idx, { accentColor: e.target.value })} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-border/50">
            <Label htmlFor="cat-active">Active</Label>
            <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim() || !key.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
