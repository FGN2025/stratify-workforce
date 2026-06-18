import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink } from 'lucide-react';
import { ICON_OPTIONS, getIconByKey } from '@/lib/sim-icons';
import { useDeepDiveResources } from '@/hooks/useDeepDiveResources';
import { useGameChannels } from '@/hooks/useGameChannels';
import type { SimCategory } from '@/hooks/useSimCategories';
import type { GameTitle } from '@/types/tenant';

// Static fallback labels for known GameTitle enum values. The live list of
// selectable games is sourced from `game_channels` (auto-populated by
// fetch-challenges) so any new SIM appears here without a code change.
const FALLBACK_GAME_LABELS: Record<GameTitle, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
  Fiber_Tech: 'Fiber-Tech Simulator',
  Roadcraft: 'Roadcraft',
  MSFS_2024: 'Microsoft Flight Simulator 2024',
  House_Flipper: 'House Flipper',
  House_Flipper_2: 'House Flipper 2',
  Electrician_Sim: 'Electrician Simulator',
};
const KNOWN_GAMES = Object.keys(FALLBACK_GAME_LABELS) as GameTitle[];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: SimCategory | null;
  onSave: (data: Partial<SimCategory> & { resource_ids: string[] }) => Promise<void>;
  onManageLibrary?: () => void;
}

export function SimCategoryEditDialog({ open, onOpenChange, category, onSave, onManageLibrary }: Props) {
  const isEditing = !!category;
  const { data: libraryResources = [] } = useDeepDiveResources(true);
  const { data: gameChannels = [] } = useGameChannels();
  // Union of game_channels rows and the known GameTitle enum so admins always
  // see every SIM, even if a channel row hasn't been created yet.
  const allGames = Array.from(
    new Set<GameTitle>([
      ...gameChannels.map((c) => c.game_title),
      ...KNOWN_GAMES,
    ])
  );
  const gameLabel = (g: GameTitle) =>
    gameChannels.find((c) => c.game_title === g)?.name ?? FALLBACK_GAME_LABELS[g] ?? g;
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sidebarLabel, setSidebarLabel] = useState('');
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [iconKey, setIconKey] = useState('target');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [defaultGames, setDefaultGames] = useState<GameTitle[]>([]);
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(category?.key ?? '');
    setTitle(category?.title ?? '');
    setSubtitle(category?.subtitle ?? '');
    setSidebarLabel(category?.sidebar_label ?? '');
    setShowInSidebar(category?.show_in_sidebar ?? true);
    setIconKey(category?.icon_key ?? 'target');
    setAccentColor(category?.accent_color ?? '#F59E0B');
    setDisplayOrder(category?.display_order ?? 0);
    setDefaultGames(category?.default_game_titles ?? []);
    setResourceIds(category?.resource_ids ?? []);
    setIsActive(category?.is_active ?? true);
  }, [open, category]);


  const toggleGame = (g: GameTitle) =>
    setDefaultGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const toggleResource = (id: string) =>
    setResourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const moveResource = (id: string, dir: -1 | 1) => {
    setResourceIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !key.trim()) return;
    setSaving(true);
    try {
      await onSave({
        key: key.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        sidebar_label: sidebarLabel.trim() || null,
        show_in_sidebar: showInSidebar,
        icon_key: iconKey,
        accent_color: accentColor,
        display_order: displayOrder,
        default_game_titles: defaultGames,
        deep_dive_resources: [], // legacy JSONB cleared in favor of library
        is_active: isActive,
        resource_ids: resourceIds,
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
            Configure a SIM category, its default games, and Deep Dive resources from the library.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-key">Key *</Label>
              <Input id="cat-key" value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} disabled={isEditing} placeholder="trucking" required />
              <p className="text-xs text-muted-foreground">Stable identifier — cannot change once set.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input id="cat-order" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Shown under the section title" />
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sidebar-label">Sidebar Label</Label>
              <Input
                id="sidebar-label"
                value={sidebarLabel}
                onChange={(e) => setSidebarLabel(e.target.value)}
                placeholder={title || 'Defaults to Title'}
              />
              <p className="text-xs text-muted-foreground">
                Overrides the name shown in the sidebar SIM Categories group. Leave blank to use the Title above. The Work Orders filter always uses the Title.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show in Sidebar</Label>
                <p className="text-xs text-muted-foreground">Hide this category from the sidebar without deleting it.</p>
              </div>
              <Switch checked={showInSidebar} onCheckedChange={setShowInSidebar} />
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={iconKey} onValueChange={setIconKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((o) => {
                    const I = o.icon;
                    return <SelectItem key={o.key} value={o.key}><div className="flex items-center gap-2"><I className="h-4 w-4" />{o.label}</div></SelectItem>;
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
            <Label>Default SIM Games</Label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-md border border-border/50 bg-muted/20">
              {allGames.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={defaultGames.includes(g)} onCheckedChange={() => toggleGame(g)} />
                  {gameLabel(g)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Deep Dive Resources</Label>
              {onManageLibrary && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onManageLibrary}>
                  Manage library <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 divide-y divide-border/50 max-h-[260px] overflow-y-auto">
              {libraryResources.length === 0 && (
                <p className="text-xs text-muted-foreground p-3">No resources in the library yet. Add some from the Deep Dive Library tab.</p>
              )}
              {/* Selected first, in order */}
              {[...resourceIds.map((id) => libraryResources.find((r) => r.id === id)).filter(Boolean),
                ...libraryResources.filter((r) => !resourceIds.includes(r.id))].map((r, idx, arr) => {
                if (!r) return null;
                const Icon = getIconByKey(r.icon_key);
                const selected = resourceIds.includes(r.id);
                const selectedIdx = resourceIds.indexOf(r.id);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5">
                    <Checkbox checked={selected} onCheckedChange={() => toggleResource(r.id)} />
                    <Icon className="h-4 w-4 shrink-0" style={{ color: r.accent_color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.href}</p>
                    </div>
                    {selected && (
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === 0} onClick={() => moveResource(r.id, -1)}>↑</Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === resourceIds.length - 1} onClick={() => moveResource(r.id, 1)}>↓</Button>
                      </div>
                    )}
                    {idx === resourceIds.length - 1 && resourceIds.length > 0 && resourceIds.length < arr.length && (
                      <span className="sr-only">divider</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-border/50">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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
