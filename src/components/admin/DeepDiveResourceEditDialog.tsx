import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ICON_OPTIONS } from '@/lib/sim-icons';
import type { DeepDiveResource } from '@/hooks/useDeepDiveResources';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resource: DeepDiveResource | null;
  onSave: (data: Partial<DeepDiveResource>) => Promise<void>;
}

export function DeepDiveResourceEditDialog({ open, onOpenChange, resource, onSave }: Props) {
  const isEditing = !!resource;
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [href, setHref] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [iconKey, setIconKey] = useState('graduation-cap');
  const [accentColor, setAccentColor] = useState('#8B5CF6');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(resource?.key ?? '');
    setTitle(resource?.title ?? '');
    setDescription(resource?.description ?? '');
    setHref(resource?.href ?? '');
    setCtaLabel(resource?.cta_label ?? '');
    setIconKey(resource?.icon_key ?? 'graduation-cap');
    setAccentColor(resource?.accent_color ?? '#8B5CF6');
    setDisplayOrder(resource?.display_order ?? 0);
    setIsActive(resource?.is_active ?? true);
  }, [open, resource]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !key.trim() || !href.trim()) return;
    setSaving(true);
    try {
      await onSave({
        key: key.trim(),
        title: title.trim(),
        description: description.trim() || null,
        href: href.trim(),
        cta_label: ctaLabel.trim() || null,
        icon_key: iconKey,
        accent_color: accentColor,
        display_order: displayOrder,
        is_active: isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Deep Dive Resource' : 'Add Deep Dive Resource'}</DialogTitle>
          <DialogDescription>
            Library entries can be activated on any SIM Category from the category editor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Key *</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} disabled={isEditing} required placeholder="cdl_quest" />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>URL *</Label>
            <Input value={href} onChange={(e) => setHref(e.target.value)} required placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label>CTA Label</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-14 h-9 p-1" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border border-border/50">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim() || !key.trim() || !href.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
