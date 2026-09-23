import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Row = {
  tenant_id: string;
  tenant_name: string;
  uses_curation: boolean;
  included: boolean;
  is_owner: boolean;
};

/**
 * Shows an administrator exactly who will see this work order once published:
 * every community they administer, whether that community curates its own
 * catalogue, and whether this work order is in it. Prevents silently invisible
 * work orders.
 */
export function WorkOrderVisibilityPanel({ workOrderId }: { workOrderId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['work-order-visibility', workOrderId],
    enabled: !!workOrderId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc('get_work_order_visibility_report', {
        p_work_order_id: workOrderId!,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const include = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('tenant_work_order_curation')
        .upsert(
          { tenant_id: tenantId, work_order_id: workOrderId!, included: true },
          { onConflict: 'tenant_id,work_order_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Added to that community’s catalog' });
      queryClient.invalidateQueries({ queryKey: ['work-order-visibility', workOrderId] });
    },
    onError: (e) =>
      toast({ title: 'Could not add it', description: (e as Error).message, variant: 'destructive' }),
  });

  if (!workOrderId) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Save this work order first — then you can check and fix which communities will actually see it.
      </div>
    );
  }

  const visibleSomewhere = (rows ?? []).some((r) => !r.uses_curation || r.included);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div>
        <p className="font-medium">Who will see this</p>
        <p className="text-sm text-muted-foreground">
          Communities that curate their own catalog only show what has been added to it.
        </p>
      </div>

      {isLoading && <Skeleton className="h-16 w-full" />}

      {!isLoading && !rows?.length && (
        <p className="text-sm text-muted-foreground">No communities in your scope can show this work order.</p>
      )}

      {!isLoading && !!rows?.length && !visibleSomewhere && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
          <span>
            No learners can see this work order yet. Every community below curates its own catalog and none of
            them include it. Add it to at least one before you rely on it.
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {(rows ?? []).map((r) => (
          <li key={r.tenant_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              {r.tenant_name}
              {r.is_owner && <Badge variant="outline">owner</Badge>}
            </span>
            <span className="flex items-center gap-2">
              {!r.uses_curation && (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> shows everything
                </Badge>
              )}
              {r.uses_curation && r.included && (
                <Badge className="gap-1 bg-primary/15 text-primary">
                  <CheckCircle2 className="h-3 w-3" /> in their catalog
                </Badge>
              )}
              {r.uses_curation && !r.included && (
                <>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> hidden
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={include.isPending}
                    onClick={() => include.mutate(r.tenant_id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
