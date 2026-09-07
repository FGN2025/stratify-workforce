import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getWorkOrderDisplayName } from '@/lib/work-order-display';
import { WorkOrderEditDialog, type EvidenceRequirements } from '@/components/admin/WorkOrderEditDialog';
import type { Database } from '@/integrations/supabase/types';

type Row = Database['public']['Tables']['work_orders']['Row'];

type EditableWorkOrder = Omit<Row, 'evidence_requirements' | 'metadata'> & {
  evidence_requirements: EvidenceRequirements | null;
  metadata: Record<string, unknown> | null;
};

export function CommunityWorkOrdersPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditableWorkOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['community-work-orders', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<EditableWorkOrder[]> => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((wo) => ({
        ...wo,
        evidence_requirements: wo.evidence_requirements as unknown as EvidenceRequirements | null,
        metadata: (wo.metadata as Record<string, unknown> | null) ?? null,
      })) as unknown as EditableWorkOrder[];
    },
  });

  const toggleActive = async (id: string, next: boolean) => {
    const { error } = await supabase.from('work_orders').update({ is_active: next }).eq('id', id);
    if (error) {
      toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['community-work-orders', tenantId] });
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" /> Work Orders
          </CardTitle>
          <CardDescription>Work orders owned by this community.</CardDescription>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading work orders…
          </div>
        ) : workOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No work orders yet. Create the first one for this community.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {workOrders.map((wo) => (
              <div
                key={wo.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{getWorkOrderDisplayName(wo as Parameters<typeof getWorkOrderDisplayName>[0])}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {wo.game_title}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {wo.difficulty}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{wo.xp_reward} XP</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!wo.is_active}
                      onCheckedChange={(v) => toggleActive(wo.id, v)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {wo.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setEditing(wo);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <WorkOrderEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workOrder={editing}
        onSave={() => {
          setDialogOpen(false);
          qc.invalidateQueries({ queryKey: ['community-work-orders', tenantId] });
        }}
      />
    </Card>
  );
}
