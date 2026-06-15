import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings2, ChevronDown, Copy, ExternalLink, Wrench, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkOrderWithXP } from '@/hooks/useWorkOrders';

interface WorkOrderAdminPanelProps {
  workOrder: WorkOrderWithXP;
}

export function WorkOrderAdminPanel({ workOrder }: WorkOrderAdminPanelProps) {
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(workOrder.is_active);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshWriting, setRefreshWriting] = useState(false);
  const [refreshPreview, setRefreshPreview] = useState<any>(null);
  const queryClient = useQueryClient();

  const currentPlaySource =
    (workOrder as any).metadata && typeof (workOrder as any).metadata === 'object'
      ? (workOrder as any).metadata.play_source ?? null
      : null;

  const openRefreshDialog = async () => {
    setRefreshDialogOpen(true);
    setRefreshLoading(true);
    setRefreshPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-play-source', {
        body: { work_order_ids: [workOrder.id], dry_run: true, force: true },
      });
      if (error) throw error;
      setRefreshPreview(data);
    } catch (e: any) {
      toast({ title: 'Refresh failed', description: e.message ?? String(e), variant: 'destructive' });
      setRefreshDialogOpen(false);
    } finally {
      setRefreshLoading(false);
    }
  };

  const confirmRefreshWrite = async () => {
    setRefreshWriting(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-play-source', {
        body: { work_order_ids: [workOrder.id], dry_run: false, force: true },
      });
      if (error) throw error;
      const row = data?.rows?.[0];
      if (row?.status === 'updated') {
        toast({ title: 'play_source refreshed' });
        queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] });
        setRefreshDialogOpen(false);
      } else {
        toast({
          title: 'Refresh did not update',
          description: `status: ${row?.status ?? 'unknown'}`,
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Refresh write failed', description: e.message ?? String(e), variant: 'destructive' });
    } finally {
      setRefreshWriting(false);
    }
  };


  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const handleToggleActive = async (checked: boolean) => {
    setIsActive(checked);
    const { error } = await supabase
      .from('work_orders')
      .update({ is_active: checked })
      .eq('id', workOrder.id);

    if (error) {
      setIsActive(!checked);
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] });
      toast({ title: checked ? 'Work order activated' : 'Work order deactivated' });
    }
  };

  const rows: { label: string; value: string | null; copyable?: boolean; link?: string }[] = [
    { label: 'Work Order ID', value: workOrder.id, copyable: true },
    {
      label: 'FGN Origin Challenge',
      value: workOrder.fgn_origin_challenge_id,
      copyable: true,
      link: workOrder.fgn_origin_challenge_id
        ? `https://play.fgn.gg/challenges/${workOrder.fgn_origin_challenge_id}`
        : undefined,
    },
    { label: 'Source Challenge ID', value: workOrder.source_challenge_id, copyable: true },
    { label: 'Channel ID', value: workOrder.channel_id, copyable: true },
    { label: 'Tenant ID', value: workOrder.tenant_id, copyable: true },
    { label: 'Created', value: new Date(workOrder.created_at).toLocaleString() },
    { label: 'Max Attempts', value: workOrder.max_attempts?.toString() ?? 'Unlimited' },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-dashed border-primary/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings2 className="h-4 w-4 text-primary" />
              Admin Details
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">Active</span>
              <div className="flex items-center gap-2">
                <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                  {isActive ? 'Live' : 'Inactive'}
                </Badge>
                <Switch checked={isActive} onCheckedChange={handleToggleActive} />
              </div>
            </div>

            {/* Course Builder shortcut */}
            <Button asChild size="sm" className="w-full justify-between shadow-sm">
              <Link to={`/admin/course-builder?workOrderId=${workOrder.id}`}>
                <span className="flex items-center">
                  <Wrench className="h-4 w-4 mr-2" />
                  Build SCORM course from this Work Order
                </span>
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Link>
            </Button>

            {/* Refresh play_source */}
            {workOrder.fgn_origin_challenge_id && (
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-between"
                onClick={openRefreshDialog}
              >
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh play_source from play.fgn.gg
                </span>
                <Badge variant={currentPlaySource ? 'default' : 'secondary'} className="text-xs">
                  {currentPlaySource ? 'present' : 'missing'}
                </Badge>
              </Button>
            )}



            {/* Metadata rows */}
            <TooltipProvider>
              <div className="space-y-1">
                {rows.map(({ label, value, copyable, link }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/20 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-1.5">
                      {value ? (
                        <>
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded max-w-[220px] truncate">
                            {value}
                          </code>
                          {copyable && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(value, label)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                          )}
                          {link && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => window.open(link, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open on play.fgn.gg</TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </CardContent>
        </CollapsibleContent>
      </Card>

      <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refresh play_source</DialogTitle>
            <DialogDescription>
              This writes only <code>metadata.play_source</code>. The work order's <code>cover_image_url</code>,
              title, difficulty, XP, description, and all relationships are untouched. The cover inside
              <code> play_source.cover_image_url</code> is leg-2 fallback only; leg-1
              (<code>work_orders.cover_image_url</code>) keeps winning.
            </DialogDescription>
          </DialogHeader>

          {refreshLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching snapshot from play.fgn.gg...
            </div>
          )}

          {!refreshLoading && refreshPreview && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border p-2">
                  <div className="text-xs uppercase text-muted-foreground mb-1">Current play_source</div>
                  <pre className="text-xs overflow-x-auto max-h-64">
                    {currentPlaySource ? JSON.stringify(currentPlaySource, null, 2) : '— (none)'}
                  </pre>
                </div>
                <div className="rounded border p-2">
                  <div className="text-xs uppercase text-muted-foreground mb-1">New snapshot</div>
                  <pre className="text-xs overflow-x-auto max-h-64">
                    {JSON.stringify(refreshPreview?.rows?.[0]?.play_source ?? refreshPreview?.rows?.[0], null, 2)}
                  </pre>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Status: {refreshPreview?.rows?.[0]?.status}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefreshDialogOpen(false)} disabled={refreshWriting}>
              Cancel
            </Button>
            <Button
              onClick={confirmRefreshWrite}
              disabled={refreshLoading || refreshWriting || !refreshPreview?.rows?.[0]?.play_source}
            >
              {refreshWriting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Write play_source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
