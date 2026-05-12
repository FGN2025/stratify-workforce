import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Plus, Trash2, ExternalLink, Library } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDeepDiveResources, useCategoryResourceLinks, type DeepDiveResource } from '@/hooks/useDeepDiveResources';
import { getIconByKey } from '@/lib/sim-icons';
import { DeepDiveResourceEditDialog } from './DeepDiveResourceEditDialog';

export function DeepDiveLibraryManager() {
  const qc = useQueryClient();
  const { data: resources = [], isLoading } = useDeepDiveResources(true);
  const { data: links = [] } = useCategoryResourceLinks();
  const [editing, setEditing] = useState<DeepDiveResource | null>(null);
  const [open, setOpen] = useState(false);

  const usageByResource = useMemo(() => {
    const map: Record<string, number> = {};
    links.forEach((l) => { map[l.resource_id] = (map[l.resource_id] ?? 0) + 1; });
    return map;
  }, [links]);

  const handleSave = async (data: Partial<DeepDiveResource>) => {
    try {
      const payload = {
        key: data.key!,
        title: data.title!,
        description: data.description ?? null,
        href: data.href!,
        cta_label: data.cta_label ?? null,
        icon_key: data.icon_key ?? 'graduation-cap',
        accent_color: data.accent_color ?? '#8B5CF6',
        display_order: data.display_order ?? 0,
        is_active: data.is_active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from('sim_deep_dive_resources').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sim_deep_dive_resources').insert(payload);
        if (error) throw error;
      }
      toast({ title: editing ? 'Resource updated' : 'Resource created' });
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['deep-dive-resources'] });
      qc.invalidateQueries({ queryKey: ['sim-categories'] });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (r: DeepDiveResource) => {
    const usage = usageByResource[r.id] ?? 0;
    const msg = usage > 0
      ? `Delete "${r.title}"? It is currently activated on ${usage} categor${usage === 1 ? 'y' : 'ies'} and will be removed from all of them.`
      : `Delete "${r.title}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from('sim_deep_dive_resources').delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Resource deleted' });
    qc.invalidateQueries({ queryKey: ['deep-dive-resources'] });
    qc.invalidateQueries({ queryKey: ['sim-categories'] });
    qc.invalidateQueries({ queryKey: ['sim-category-deep-dive'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" /> Deep Dive Library
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable resources (e.g. CDL Quest, CDL Exchange). Activate them on any SIM Category from the category editor.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Resource
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : resources.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
          No resources yet. Add one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((r) => {
            const Icon = getIconByKey(r.icon_key);
            const usage = usageByResource[r.id] ?? 0;
            return (
              <Card key={r.id} style={{ borderLeftColor: r.accent_color, borderLeftWidth: 4 }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg shrink-0" style={{ backgroundColor: `${r.accent_color}20` }}>
                        <Icon className="h-5 w-5" style={{ color: r.accent_color }} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{r.title}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">{r.key}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {r.description && <p className="text-muted-foreground line-clamp-2">{r.description}</p>}
                  <a href={r.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-full">
                    <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{r.href}</span>
                  </a>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Badge variant="outline" className="text-[10px]">Used by {usage} categor{usage === 1 ? 'y' : 'ies'}</Badge>
                    <span className={r.is_active ? 'text-emerald-400' : 'text-muted-foreground'}>{r.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeepDiveResourceEditDialog open={open} onOpenChange={setOpen} resource={editing} onSave={handleSave} />
    </div>
  );
}
