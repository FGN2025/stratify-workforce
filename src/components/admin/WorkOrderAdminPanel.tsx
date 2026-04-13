import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings2, ChevronDown, Copy, ExternalLink } from 'lucide-react';
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
  const queryClient = useQueryClient();

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
    </Collapsible>
  );
}
