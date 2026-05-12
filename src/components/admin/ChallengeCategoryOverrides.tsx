import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSimCategories, resolveCategoryKey, type SimCategory } from '@/hooks/useSimCategories';
import type { GameTitle } from '@/types/tenant';

interface WORow {
  id: string;
  title: string;
  game_title: GameTitle;
  category_key: string | null;
}

export function ChallengeCategoryOverrides() {
  const qc = useQueryClient();
  const { data: categories = [] } = useSimCategories(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['admin-wo-overrides'],
    queryFn: async (): Promise<WORow[]> => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, title, game_title, category_key')
        .order('title', { ascending: true });
      if (error) throw error;
      return (data || []) as WORow[];
    },
  });

  const filtered = useMemo(() => {
    return workOrders.filter((w) => {
      if (search && !w.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'all') return true;
      if (filter === 'overridden') return !!w.category_key;
      if (filter === 'uncategorized') return !resolveCategoryKey(w, categories);
      return resolveCategoryKey(w, categories) === filter;
    });
  }, [workOrders, search, filter, categories]);

  const updateOverride = async (id: string, value: string | null) => {
    const { error } = await supabase
      .from('work_orders')
      .update({ category_key: value })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-wo-overrides'] });
    qc.invalidateQueries({ queryKey: ['work-orders'] });
    toast({ title: 'Updated', description: value ? 'Category override saved.' : 'Reverted to default category.' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Challenge Overrides</h3>
          <p className="text-sm text-muted-foreground">Reassign individual work orders to a different category without changing their game.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search work orders…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="overridden">Overridden</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.key} value={c.key}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <div className="rounded-md border border-border/50 divide-y divide-border/50 max-h-[500px] overflow-y-auto">
          {filtered.map((w) => {
            const resolvedKey = resolveCategoryKey(w, categories);
            const resolved = categories.find((c) => c.key === resolvedKey);
            const isOverride = !!w.category_key;
            return (
              <div key={w.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{w.game_title.replace('_', ' ')}</Badge>
                    {resolved ? (
                      <Badge variant="secondary" className="text-[10px]" style={{ borderColor: resolved.accent_color, color: resolved.accent_color }}>
                        {isOverride ? 'override → ' : 'default → '}{resolved.title}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Uncategorized</Badge>
                    )}
                  </div>
                </div>
                <Select value={w.category_key ?? 'none'} onValueChange={(v) => updateOverride(w.id, v === 'none' ? null : v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use default mapping</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">No work orders match.</div>
          )}
        </div>
      )}
    </div>
  );
}
