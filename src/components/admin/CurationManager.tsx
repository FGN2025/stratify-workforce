import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantAdminGuard } from '@/hooks/useTenantAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Kind = 'work_orders' | 'events' | 'courses';

const CURATION_TABLE: Record<Kind, 'tenant_work_order_curation' | 'tenant_event_curation' | 'tenant_course_curation'> = {
  work_orders: 'tenant_work_order_curation',
  events: 'tenant_event_curation',
  courses: 'tenant_course_curation',
};

const FK_COLUMN: Record<Kind, 'work_order_id' | 'event_id' | 'course_id'> = {
  work_orders: 'work_order_id',
  events: 'event_id',
  courses: 'course_id',
};

function CurationList({ kind, tenantId }: { kind: Kind; tenantId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const curationTable = CURATION_TABLE[kind];
  const fkCol = FK_COLUMN[kind];

  const itemsQuery = useQuery({
    queryKey: ['curation-items', kind],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> }
        }
      };
      const select = kind === 'events'
        ? 'id, title, visibility, owner_tenant_id'
        : 'id, title, game_title, visibility, owner_tenant_id';
      const { data, error } = await client.from(kind).select(select).order('title', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        title: string | null;
        game_title?: string | null;
        visibility: string;
        owner_tenant_id: string | null;
      }>;
    },
  });

  const curationQuery = useQuery({
    queryKey: ['curation-rows', kind, tenantId],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => { eq: (c: string, v: string) => Promise<{ data: unknown; error: { message: string } | null }> }
        }
      };
      const { data, error } = await client.from(curationTable).select(`${fkCol}, included`).eq('tenant_id', tenantId);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });

  const curatedSet = useMemo(() => {
    const set = new Set<string>();
    (curationQuery.data ?? []).forEach(row => {
      if (row.included) set.add(String(row[fkCol]));
    });
    return set;
  }, [curationQuery.data, fkCol]);

  const hasAnyCuration = (curationQuery.data ?? []).length > 0;

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, include }: { itemId: string; include: boolean }) => {
      const client = supabase as unknown as {
        from: (t: string) => {
          upsert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
          delete: () => { eq: (c: string, v: string) => { eq: (c2: string, v2: string) => Promise<{ error: { message: string } | null }> } };
        }
      };
      if (include) {
        const { error } = await client.from(curationTable).upsert({
          tenant_id: tenantId,
          [fkCol]: itemId,
          included: true,
          added_by: user?.id ?? null,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await client.from(curationTable)
          .delete()
          .eq('tenant_id', tenantId)
          .eq(fkCol, itemId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curation-rows', kind, tenantId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  const enableCuratedMutation = useMutation({
    mutationFn: async () => {
      const all = (itemsQuery.data ?? []).filter(it => it.visibility === 'public');
      if (all.length === 0) return;
      const client = supabase as unknown as {
        from: (t: string) => {
          upsert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
        }
      };
      const rows = all.map(it => ({
        tenant_id: tenantId,
        [fkCol]: it.id,
        included: true,
        added_by: user?.id ?? null,
      }));
      const { error } = await client.from(curationTable).upsert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curation-rows', kind, tenantId] });
      toast({ title: 'Curated mode enabled', description: 'All current items included. Toggle any item off to hide it.' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const revertMutation = useMutation({
    mutationFn: async () => {
      const client = supabase as unknown as {
        from: (t: string) => {
          delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        }
      };
      const { error } = await client.from(curationTable).delete().eq('tenant_id', tenantId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curation-rows', kind, tenantId] });
      toast({ title: 'Reverted to default', description: 'Members now see the full public catalog.' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  if (itemsQuery.isLoading || curationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const items = (itemsQuery.data ?? []).filter(it => {
    if (!search) return true;
    return (it.title ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${kind.replace('_', ' ')}…`}
            className="pl-9"
          />
        </div>
        <Badge variant={hasAnyCuration ? 'default' : 'secondary'}>
          {hasAnyCuration
            ? `Curated mode (${curatedSet.size} included)`
            : 'Default: full public catalog'}
        </Badge>
        {hasAnyCuration ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => revertMutation.mutate()}
            disabled={revertMutation.isPending}
          >
            Revert to default
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => enableCuratedMutation.mutate()}
            disabled={enableCuratedMutation.isPending}
          >
            Enable curated mode
          </Button>
        )}
      </div>

      {!hasAnyCuration && (
        <p className="text-xs text-muted-foreground">
          Currently in default mode — members see all public items. Click "Enable curated mode" to start
          picking which items appear, then toggle individual items off to hide them.
        </p>
      )}

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {items.map(item => {
          const included = curatedSet.has(item.id);
          const isPrivate = item.visibility === 'tenant_private';
          const ownedByThis = item.owner_tenant_id === tenantId;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{item.title || 'Untitled'}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {item.game_title && <span>{item.game_title}</span>}
                  {isPrivate && (
                    <Badge variant="outline" className="text-[10px]">
                      {ownedByThis ? 'Yours (private)' : 'Private'}
                    </Badge>
                  )}
                </div>
              </div>
              {isPrivate ? (
                <span className="text-xs text-muted-foreground">always visible to your community</span>
              ) : (
                <Switch
                  checked={hasAnyCuration ? included : true}
                  disabled={!hasAnyCuration || toggleMutation.isPending}
                  onCheckedChange={(v) => toggleMutation.mutate({ itemId: item.id, include: v })}
                />
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No items match.</p>
        )}
      </div>
    </div>
  );
}


export function CurationManager() {
  const { tenant } = useTenant();
  const { canManageTenant, isLoading } = useTenantAdminGuard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Verifying access…
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active community selected.
        </CardContent>
      </Card>
    );
  }

  if (!canManageTenant) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
          <ShieldAlert className="h-6 w-6" />
          <p>You don't have admin permissions for {tenant.name}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Curation — {tenant.name}</CardTitle>
        <CardDescription>
          Choose which public catalog items your community members see. Items you
          haven't picked are hidden once you switch to curated mode. Tenant-private
          items you own are always visible to your members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="work_orders" className="w-full">
          <TabsList>
            <TabsTrigger value="work_orders">Work Orders</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>
          <TabsContent value="work_orders" className="mt-4">
            <CurationList kind="work_orders" tenantId={tenant.id} />
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <CurationList kind="events" tenantId={tenant.id} />
          </TabsContent>
          <TabsContent value="courses" className="mt-4">
            <CurationList kind="courses" tenantId={tenant.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
