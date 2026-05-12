import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Plus, Trash2, Layers, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSimCategories, type SimCategory } from '@/hooks/useSimCategories';
import { getIconByKey } from '@/lib/sim-icons';
import { SimCategoryEditDialog } from './SimCategoryEditDialog';
import { ChallengeCategoryOverrides } from './ChallengeCategoryOverrides';

export function SimCategoriesManager() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useSimCategories(true);
  const [editing, setEditing] = useState<SimCategory | null>(null);
  const [open, setOpen] = useState(false);

  const handleSave = async (data: Partial<SimCategory>) => {
    try {
      const payload = {
        key: data.key!,
        title: data.title!,
        subtitle: data.subtitle ?? null,
        icon_key: data.icon_key ?? 'target',
        accent_color: data.accent_color ?? '#F59E0B',
        display_order: data.display_order ?? 0,
        default_game_titles: data.default_game_titles ?? [],
        deep_dive_resources: data.deep_dive_resources ?? [],
        is_active: data.is_active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from('sim_categories' as never).update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sim_categories' as never).insert(payload);
        if (error) throw error;
      }
      toast({ title: editing ? 'Category updated' : 'Category created' });
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['sim-categories'] });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (cat: SimCategory) => {
    if (!confirm(`Delete category "${cat.title}"? Work orders with this override will revert to default mapping.`)) return;
    const { error } = await supabase.from('sim_categories' as never).delete().eq('id', cat.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Category deleted' });
    qc.invalidateQueries({ queryKey: ['sim-categories'] });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> SIM Categories
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Industry rows shown on the Work Orders page. Each category groups one or more SIM games and can include Deep Dive resources.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const Icon = getIconByKey(cat.icon_key);
            return (
              <Card key={cat.id} style={{ borderLeftColor: cat.accent_color, borderLeftWidth: 4 }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${cat.accent_color}20` }}>
                        <Icon className="h-6 w-6" style={{ color: cat.accent_color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{cat.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{cat.subtitle || '—'}</p>
                      </div>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(cat); setOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Default games:</span>
                    {cat.default_game_titles.length === 0 && <span className="text-xs text-muted-foreground/70">None</span>}
                    {cat.default_game_titles.map((g) => (
                      <Badge key={g} variant="outline" className="text-[10px]">{g.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Deep Dive:</span>
                    {cat.deep_dive_resources.length === 0 ? (
                      <span className="text-xs text-muted-foreground/70">No resources</span>
                    ) : (
                      cat.deep_dive_resources.map((r) => (
                        <Badge key={r.key} variant="secondary" className="text-[10px] gap-1">
                          <ExternalLink className="h-2.5 w-2.5" />{r.title}
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <span>Order: {cat.display_order}</span>
                    <span className={cat.is_active ? 'text-emerald-400' : 'text-muted-foreground'}>{cat.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChallengeCategoryOverrides />

      <SimCategoryEditDialog open={open} onOpenChange={setOpen} category={editing} onSave={handleSave} />
    </div>
  );
}
