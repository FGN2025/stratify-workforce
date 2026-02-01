import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
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
}

interface GameChannel {
  id: string;
  name: string;
  game_title: GameTitle;
}

interface Tenant {
  id: string;
  name: string;
}

interface WorkOrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder | null;
  onSave: () => void;
}

export function WorkOrderEditDialog({
  open,
  onOpenChange,
  workOrder,
  onSave,
}: WorkOrderEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [channels, setChannels] = useState<GameChannel[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameTitle, setGameTitle] = useState<GameTitle>('ATS');
  const [difficulty, setDifficulty] = useState<WorkOrderDifficulty>('beginner');
  const [xpReward, setXpReward] = useState(50);
  const [estimatedTime, setEstimatedTime] = useState<string>('30');
  const [maxAttempts, setMaxAttempts] = useState<string>('');
  const [minScore, setMinScore] = useState<string>('80');
  const [maxDamage, setMaxDamage] = useState<string>('5');
  const [isActive, setIsActive] = useState(true);
  const [channelId, setChannelId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');

  // Fetch channels and tenants on mount
  useEffect(() => {
    const fetchData = async () => {
      const [channelsRes, tenantsRes] = await Promise.all([
        supabase.from('game_channels').select('id, name, game_title'),
        supabase.from('tenants').select('id, name'),
      ]);

      if (channelsRes.data) setChannels(channelsRes.data);
      if (tenantsRes.data) setTenants(tenantsRes.data);
    };
    fetchData();
  }, []);

  // Reset form when dialog opens/closes or workOrder changes
  useEffect(() => {
    if (open) {
      if (workOrder) {
        setTitle(workOrder.title);
        setDescription(workOrder.description || '');
        setGameTitle(workOrder.game_title);
        setDifficulty(workOrder.difficulty);
        setXpReward(workOrder.xp_reward);
        setEstimatedTime(workOrder.estimated_time_minutes?.toString() || '');
        setMaxAttempts(workOrder.max_attempts?.toString() || '');
        // Parse success_criteria from Json type
        const criteria = workOrder.success_criteria as { min_score?: number; max_damage?: number } | null;
        setMinScore(criteria?.min_score?.toString() || '80');
        setMaxDamage(criteria?.max_damage?.toString() || '5');
        setIsActive(workOrder.is_active ?? true);
        setChannelId(workOrder.channel_id || '');
        setTenantId(workOrder.tenant_id || '');
      } else {
        // Reset to defaults for create mode
        setTitle('');
        setDescription('');
        setGameTitle('ATS');
        setDifficulty('beginner');
        setXpReward(50);
        setEstimatedTime('30');
        setMaxAttempts('');
        setMinScore('80');
        setMaxDamage('5');
        setIsActive(true);
        setChannelId('');
        setTenantId('');
      }
    }
  }, [open, workOrder]);

  // Filter channels by selected game
  const filteredChannels = channels.filter((c) => c.game_title === gameTitle);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const successCriteria: { min_score?: number; max_damage?: number } = {};
      if (minScore) successCriteria.min_score = parseInt(minScore, 10);
      if (maxDamage) successCriteria.max_damage = parseInt(maxDamage, 10);

      const data = {
        title: title.trim(),
        description: description.trim() || null,
        game_title: gameTitle,
        difficulty,
        xp_reward: xpReward,
        estimated_time_minutes: estimatedTime ? parseInt(estimatedTime, 10) : null,
        max_attempts: maxAttempts ? parseInt(maxAttempts, 10) : null,
        success_criteria: Object.keys(successCriteria).length > 0 ? successCriteria : null,
        is_active: isActive,
        channel_id: channelId || null,
        tenant_id: tenantId || null,
      };

      if (workOrder) {
        // Update existing
        const { error } = await supabase
          .from('work_orders')
          .update(data)
          .eq('id', workOrder.id);

        if (error) throw error;

        toast({
          title: 'Updated',
          description: 'Work order has been updated.',
        });
      } else {
        // Create new
        const { error } = await supabase.from('work_orders').insert(data);

        if (error) throw error;

        toast({
          title: 'Created',
          description: 'New work order has been created.',
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving work order:', error);
      toast({
        title: 'Error',
        description: 'Failed to save work order.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workOrder ? 'Edit Work Order' : 'Create Work Order'}
          </DialogTitle>
          <DialogDescription>
            {workOrder
              ? 'Update the work order details below.'
              : 'Configure a new training scenario for simulation games.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter work order title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work order objectives and requirements"
              rows={3}
            />
          </div>

          {/* Game and Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="game">Game *</Label>
              <Select value={gameTitle} onValueChange={(v) => setGameTitle(v as GameTitle)}>
                <SelectTrigger id="game">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATS">American Truck Simulator</SelectItem>
                  <SelectItem value="Farming_Sim">Farming Simulator</SelectItem>
                  <SelectItem value="Construction_Sim">Construction Simulator</SelectItem>
                  <SelectItem value="Mechanic_Sim">Mechanic Simulator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty *</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as WorkOrderDifficulty)}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* XP and Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="xp">XP Reward *</Label>
              <Input
                id="xp"
                type="number"
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Est. Time (min)</Label>
              <Input
                id="time"
                type="number"
                min={1}
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attempts">Max Attempts</Label>
              <Input
                id="attempts"
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {/* Success Criteria */}
          <div className="space-y-3">
            <Label>Success Criteria</Label>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="minScore" className="text-sm font-normal text-muted-foreground">
                  Minimum Score (%)
                </Label>
                <Input
                  id="minScore"
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  placeholder="80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDamage" className="text-sm font-normal text-muted-foreground">
                  Max Damage Allowed
                </Label>
                <Input
                  id="maxDamage"
                  type="number"
                  min={0}
                  value={maxDamage}
                  onChange={(e) => setMaxDamage(e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Channel and Tenant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Game Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select channel (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {filteredChannels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant">Community</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Select community (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Global)</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
            <div>
              <Label htmlFor="active" className="font-medium">
                Active
              </Label>
              <p className="text-sm text-muted-foreground">
                Inactive work orders won't appear in the public listing
              </p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {workOrder ? 'Save Changes' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
