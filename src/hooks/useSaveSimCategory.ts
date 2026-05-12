import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SimCategory } from '@/hooks/useSimCategories';

export function useSaveSimCategory() {
  const qc = useQueryClient();

  return async (
    data: Partial<SimCategory> & { resource_ids?: string[] },
    editing: SimCategory | null,
  ): Promise<boolean> => {
    try {
      const payload = {
        key: data.key!,
        title: data.title!,
        subtitle: data.subtitle ?? null,
        icon_key: data.icon_key ?? 'target',
        accent_color: data.accent_color ?? '#F59E0B',
        display_order: data.display_order ?? 0,
        default_game_titles: data.default_game_titles ?? [],
        deep_dive_resources: (data.deep_dive_resources ?? []) as unknown as never,
        is_active: data.is_active ?? true,
      };

      let categoryId: string;
      if (editing) {
        const { error } = await supabase.from('sim_categories').update(payload).eq('id', editing.id);
        if (error) throw error;
        categoryId = editing.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('sim_categories')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        categoryId = inserted.id;
      }

      // Sync deep dive resource links if provided
      if (data.resource_ids) {
        await supabase.from('sim_category_deep_dive').delete().eq('category_id', categoryId);
        if (data.resource_ids.length > 0) {
          const rows = data.resource_ids.map((rid, idx) => ({
            category_id: categoryId,
            resource_id: rid,
            display_order: idx,
          }));
          const { error: linkErr } = await supabase.from('sim_category_deep_dive').insert(rows);
          if (linkErr) throw linkErr;
        }
      }

      toast({ title: editing ? 'Category updated' : 'Category created' });
      qc.invalidateQueries({ queryKey: ['sim-categories'] });
      qc.invalidateQueries({ queryKey: ['sim-category-deep-dive'] });
      qc.invalidateQueries({ queryKey: ['deep-dive-resources'] });
      return true;
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      return false;
    }
  };
}
