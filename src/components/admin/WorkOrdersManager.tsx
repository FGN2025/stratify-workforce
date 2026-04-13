import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameCoverImages } from '@/hooks/useSiteMedia';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Edit, Trash2, Clock, Trophy, FileUp, Eye, List, LayoutGrid } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DifficultyIndicator } from '@/components/work-orders/DifficultyIndicator';
import { XPRewardBadge } from '@/components/work-orders/XPRewardBadge';
import { NavLink } from 'react-router-dom';
import { WorkOrderEditDialog, type EvidenceRequirements } from './WorkOrderEditDialog';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];
type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];
type Json = Database['public']['Tables']['work_orders']['Row']['success_criteria'];

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  game_title: GameTitle;
  difficulty: WorkOrderDifficulty;
  xp_reward: number;
  estimated_time_minutes: number | null;
  max_attempts: number | null;
  success_criteria: Json;
  is_active: boolean | null;
  channel_id: string | null;
  tenant_id: string | null;
  created_at: string;
  evidence_requirements: EvidenceRequirements | null;
  cover_image_url: string | null;
}

const GAME_LABELS: Record<GameTitle, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
  Fiber_Tech: 'Fiber-Tech Simulator',
  Roadcraft: 'Roadcraft',
};

const DIFFICULTY_COLORS: Record<WorkOrderDifficulty, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export function WorkOrdersManager() {
  const { gameCoverImages } = useGameCoverImages();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<GameTitle | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<WorkOrderDifficulty | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Cast evidence_requirements from Json to our typed interface
      const workOrdersData = (data || []).map((wo) => ({
        ...wo,
        evidence_requirements: wo.evidence_requirements as unknown as EvidenceRequirements | null,
      }));
      setWorkOrders(workOrdersData);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load work orders.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setWorkOrders((prev) =>
        prev.map((wo) => (wo.id === id ? { ...wo, is_active: !currentStatus } : wo))
      );

      toast({
        title: 'Status Updated',
        description: `Work order ${!currentStatus ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from('work_orders').delete().eq('id', deleteId);

      if (error) throw error;

      setWorkOrders((prev) => prev.filter((wo) => wo.id !== deleteId));
      toast({
        title: 'Deleted',
        description: 'Work order has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete work order.',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleSave = async () => {
    await fetchWorkOrders();
    setIsDialogOpen(false);
    setEditingWorkOrder(null);
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingWorkOrder(null);
    setIsDialogOpen(true);
  };

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchesGame = gameFilter === 'all' || wo.game_title === gameFilter;
      const matchesDifficulty = difficultyFilter === 'all' || wo.difficulty === difficultyFilter;
      return matchesGame && matchesDifficulty;
    });
  }, [workOrders, gameFilter, difficultyFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Work Orders Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure training scenarios for simulation games
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={gameFilter}
          onValueChange={(v) => setGameFilter(v as GameTitle | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            <SelectItem value="ATS">American Truck Simulator</SelectItem>
            <SelectItem value="Farming_Sim">Farming Simulator</SelectItem>
            <SelectItem value="Construction_Sim">Construction Simulator</SelectItem>
            <SelectItem value="Mechanic_Sim">Mechanic Simulator</SelectItem>
            <SelectItem value="Fiber_Tech">Fiber-Tech Simulator</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={difficultyFilter}
          onValueChange={(v) => setDifficultyFilter(v as WorkOrderDifficulty | 'all')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>

        {(gameFilter !== 'all' || difficultyFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setGameFilter('all');
              setDifficultyFilter('all');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredWorkOrders.length} of {workOrders.length} work orders
      </p>

      {/* List / Grid View */}
      {viewMode === 'list' ? (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-center">XP</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center">Evidence</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No work orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkOrders.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <NavLink
                        to={`/work-orders/${wo.id}`}
                        state={{ from: 'admin' }}
                        className="hover:text-primary hover:underline underline-offset-4 transition-colors truncate block"
                      >
                        {wo.title}
                      </NavLink>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{GAME_LABELS[wo.game_title]}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${DIFFICULTY_COLORS[wo.difficulty]}`}
                      >
                        {wo.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="h-3 w-3 text-primary" />
                        <span>{wo.xp_reward}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {wo.estimated_time_minutes ? (
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{wo.estimated_time_minutes}m</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {wo.evidence_requirements?.required ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center justify-center">
                                <FileUp className="h-4 w-4 text-primary" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {wo.evidence_requirements.min_uploads}-{wo.evidence_requirements.max_uploads} files required
                                <br />
                                Types: {wo.evidence_requirements.allowed_types.join(', ')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={wo.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(wo.id, wo.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <NavLink to={`/work-orders/${wo.id}`} state={{ from: 'admin' }}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </NavLink>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(wo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(wo.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid View */
        filteredWorkOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No work orders found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkOrders.map((wo) => (
              <Card key={wo.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                {/* Cover Image */}
                <div className="relative h-36 bg-muted overflow-hidden">
                  {wo.cover_image_url ? (
                    <img
                      src={wo.cover_image_url}
                      alt={wo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/30">
                      {gameCoverImages[wo.game_title] ? (
                        <img
                          src={gameCoverImages[wo.game_title]}
                          alt={GAME_LABELS[wo.game_title]}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground/30">
                          {GAME_LABELS[wo.game_title]?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Active badge overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={wo.is_active
                        ? 'bg-primary/20 text-primary border-primary/30 text-[10px]'
                        : 'bg-muted text-muted-foreground border-border text-[10px]'
                      }
                    >
                      {wo.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <NavLink
                    to={`/work-orders/${wo.id}`}
                    state={{ from: 'admin' }}
                    className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2 block"
                  >
                    {wo.title}
                  </NavLink>

                  {/* Game label */}
                  <p className="text-xs text-muted-foreground">{GAME_LABELS[wo.game_title]}</p>

                  {/* Difficulty + XP row */}
                  <div className="flex items-center justify-between">
                    <DifficultyIndicator difficulty={wo.difficulty} showLabel size="sm" />
                    <XPRewardBadge xp={wo.xp_reward} size="sm" />
                  </div>

                  {/* Time */}
                  {wo.estimated_time_minutes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{wo.estimated_time_minutes} min</span>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Switch
                      checked={wo.is_active ?? true}
                      onCheckedChange={() => handleToggleActive(wo.id, wo.is_active)}
                    />
                    <div className="flex items-center gap-1">
                      <NavLink to={`/work-orders/${wo.id}`} state={{ from: 'admin' }}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </NavLink>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(wo)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(wo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Edit/Create Dialog */}
      <WorkOrderEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workOrder={editingWorkOrder}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the work order
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
