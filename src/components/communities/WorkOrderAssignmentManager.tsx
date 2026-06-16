import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkOrderAssignments } from '@/hooks/useWorkOrderAssignments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  Plus,
  Trash2,
  Users,
  User,
  Loader2,
  Search,
} from 'lucide-react';
import { getWorkOrderDisplayName } from '@/lib/work-order-display';
import type { WorkOrder, GameTitle } from '@/types/tenant';

interface WorkOrderAssignmentManagerProps {
  tenantId: string;
}

export function WorkOrderAssignmentManager({ tenantId }: WorkOrderAssignmentManagerProps) {
  const {
    communityAssignments,
    memberAssignments,
    isLoading,
    assign,
    remove,
    isAssigning,
  } = useWorkOrderAssignments(tenantId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'community' | 'member'>('community');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchWO, setSearchWO] = useState('');

  // Fetch all active work orders
  const { data: allWorkOrders = [] } = useQuery({
    queryKey: ['all-work-orders-for-assign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, title, generated_name, metadata, game_title, is_active')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data as { id: string; title: string | null; generated_name: string | null; metadata: Record<string, unknown> | null; game_title: string; is_active: boolean }[];
    },
  });

  // Fetch approved community members
  const { data: members = [] } = useQuery({
    queryKey: ['community-members-for-assign', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_memberships')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('request_status', 'approved');
      if (error) throw error;

      if (!data || data.length === 0) return [];

      const userIds = data.map(m => m.user_id);
      const { data: profiles, error: pErr } = await supabase
        .rpc('get_public_profile_data', { profile_ids: userIds });
      if (pErr) throw pErr;
      return (profiles || []) as { id: string; username: string; avatar_url: string | null }[];
    },
    enabled: !!tenantId,
  });

  const filteredWOs = useMemo(() => {
    if (!searchWO) return allWorkOrders;
    const q = searchWO.toLowerCase();
    return allWorkOrders.filter(wo => getWorkOrderDisplayName(wo).toLowerCase().includes(q));
  }, [allWorkOrders, searchWO]);

  // Already-assigned WO ids for community
  const communityAssignedIds = new Set(communityAssignments.map(a => a.work_order_id));

  // WO title lookup
  const woTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    allWorkOrders.forEach(wo => { map[wo.id] = getWorkOrderDisplayName(wo); });
    return map;
  }, [allWorkOrders]);

  const memberNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach(m => { map[m.id] = m.username || m.id.slice(0, 8); });
    return map;
  }, [members]);

  const handleAssign = () => {
    if (!selectedWorkOrderId) return;
    assign(
      {
        workOrderId: selectedWorkOrderId,
        userId: assignMode === 'member' ? selectedMemberId || undefined : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setSelectedWorkOrderId('');
          setSelectedMemberId('');
          setNotes('');
          setDialogOpen(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Work Order Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Assign training scenarios to your community or specific members.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Assign Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Work Order</DialogTitle>
              <DialogDescription>
                Choose a work order and assign it to the community or a specific member.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Assignment type */}
              <Tabs value={assignMode} onValueChange={v => setAssignMode(v as 'community' | 'member')}>
                <TabsList className="w-full">
                  <TabsTrigger value="community" className="flex-1 gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Community
                  </TabsTrigger>
                  <TabsTrigger value="member" className="flex-1 gap-1">
                    <User className="h-3.5 w-3.5" />
                    Member
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Work Order selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Work Order</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search work orders..."
                    className="pl-9 mb-2"
                    value={searchWO}
                    onChange={e => setSearchWO(e.target.value)}
                  />
                </div>
                <Select value={selectedWorkOrderId} onValueChange={setSelectedWorkOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a work order" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWOs.map(wo => (
                      <SelectItem
                        key={wo.id}
                        value={wo.id}
                        disabled={assignMode === 'community' && communityAssignedIds.has(wo.id)}
                      >
                        {getWorkOrderDisplayName(wo)}
                        {assignMode === 'community' && communityAssignedIds.has(wo.id) && ' (assigned)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Member selector (only for member mode) */}
              {assignMode === 'member' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member</label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.username || m.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Add any instructions or context..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAssign}
                disabled={
                  !selectedWorkOrderId ||
                  (assignMode === 'member' && !selectedMemberId) ||
                  isAssigning
                }
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ClipboardList className="h-4 w-4 mr-2" />
                )}
                Assign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Community-wide assignments */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Community-wide
          <Badge variant="secondary" className="text-xs">{communityAssignments.length}</Badge>
        </h4>
        {communityAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No work orders assigned to the community yet.
          </p>
        ) : (
          <div className="space-y-2">
            {communityAssignments.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{woTitleMap[a.work_order_id] || 'Unknown WO'}</p>
                  {a.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member-specific assignments */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Individual Assignments
          <Badge variant="secondary" className="text-xs">{memberAssignments.length}</Badge>
        </h4>
        {memberAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No individual member assignments yet.
          </p>
        ) : (
          <div className="space-y-2">
            {memberAssignments.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{woTitleMap[a.work_order_id] || 'Unknown WO'}</p>
                  <p className="text-xs text-muted-foreground">
                    → {memberNameMap[a.user_id!] || a.user_id?.slice(0, 8)}
                    {a.notes && ` · ${a.notes}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
