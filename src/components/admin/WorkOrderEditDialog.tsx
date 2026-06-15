import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MediaPickerDialog } from './MediaPickerDialog';
import { ImportChallengeDialog, type MappedChallengeData, type ExternalTask } from './ImportChallengeDialog';
import { Loader2, ChevronDown, FileUp, ImageIcon, X, Download } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];
type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];
type Json = Database['public']['Tables']['work_orders']['Row']['success_criteria'];

export interface EvidenceRequirements {
  required: boolean;
  min_uploads: number;
  max_uploads: number;
  allowed_types: ('image' | 'video' | 'document')[];
  instructions: string;
  deadline_hours: number | null;
}

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
  evidence_requirements: EvidenceRequirements | null;
  cover_image_url: string | null;
  fgn_origin_challenge_id?: string | null;
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

  // Evidence requirements state
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [evidenceMinUploads, setEvidenceMinUploads] = useState<string>('1');
  const [evidenceMaxUploads, setEvidenceMaxUploads] = useState<string>('5');
  const [evidenceAllowedTypes, setEvidenceAllowedTypes] = useState<('image' | 'video' | 'document')[]>(['image']);
  const [evidenceInstructions, setEvidenceInstructions] = useState('');
  const [evidenceDeadlineHours, setEvidenceDeadlineHours] = useState<string>('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [fgnOriginChallengeId, setFgnOriginChallengeId] = useState<string | null>(null);
  const [pendingTasks, setPendingTasks] = useState<ExternalTask[]>([]);
  const [pendingPlaySource, setPendingPlaySource] = useState<Record<string, unknown> | null>(null);
  const [evidenceUserOverridden, setEvidenceUserOverridden] = useState(false);

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
        setCoverImageUrl(workOrder.cover_image_url || '');
        setFgnOriginChallengeId(workOrder.fgn_origin_challenge_id || null);
        // Evidence requirements
        const evidence = workOrder.evidence_requirements;
        if (evidence) {
          setEvidenceRequired(evidence.required);
          setEvidenceMinUploads(evidence.min_uploads?.toString() || '1');
          setEvidenceMaxUploads(evidence.max_uploads?.toString() || '5');
          setEvidenceAllowedTypes(evidence.allowed_types || ['image']);
          setEvidenceInstructions(evidence.instructions || '');
          setEvidenceDeadlineHours(evidence.deadline_hours?.toString() || '');
          setEvidenceOpen(evidence.required);
        } else {
          setEvidenceRequired(false);
          setEvidenceMinUploads('1');
          setEvidenceMaxUploads('5');
          setEvidenceAllowedTypes(['image']);
          setEvidenceInstructions('');
          setEvidenceDeadlineHours('');
          setEvidenceOpen(false);
        }
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
        setCoverImageUrl('');
        setFgnOriginChallengeId(null);
        setPendingTasks([]);
        setPendingPlaySource(null);
        setEvidenceUserOverridden(false);
        // Reset evidence
        setEvidenceRequired(false);
        setEvidenceMinUploads('1');
        setEvidenceMaxUploads('5');
        setEvidenceAllowedTypes(['image']);
        setEvidenceInstructions('');
        setEvidenceDeadlineHours('');
        setEvidenceOpen(false);
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

      // Build evidence requirements object
      const evidenceRequirements: EvidenceRequirements | null = evidenceRequired
        ? {
            required: true,
            min_uploads: parseInt(evidenceMinUploads, 10) || 1,
            max_uploads: parseInt(evidenceMaxUploads, 10) || 5,
            allowed_types: evidenceAllowedTypes.length > 0 ? evidenceAllowedTypes : ['image'],
            instructions: evidenceInstructions.trim(),
            deadline_hours: evidenceDeadlineHours ? parseInt(evidenceDeadlineHours, 10) : null,
          }
        : null;

      const data: Record<string, unknown> = {
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
        evidence_requirements: evidenceRequirements as unknown as Json,
        cover_image_url: coverImageUrl.trim() || null,
        fgn_origin_challenge_id: fgnOriginChallengeId || null,
      };

      // On create-path only, persist play_source snapshot for convergence-by-construction
      if (!workOrder?.id) {
        data.metadata = pendingPlaySource ? { play_source: pendingPlaySource } : {};
      }



      if (workOrder?.id) {
        // Update existing
        const { error } = await supabase
          .from('work_orders')
          .update(data as never)
          .eq('id', workOrder.id);

        if (error) throw error;

        toast({
          title: 'Updated',
          description: 'Work order has been updated.',
        });
      } else {
        // Create new
        const { data: newWO, error } = await supabase.from('work_orders').insert(data as never).select('id').single();

        if (error) throw error;


        // Auto-register a game_channels row for this game_title if one doesn't
        // exist yet, so new sims become filterable / sidebar-visible the moment
        // their first work order is imported. Best-effort; ignore failures.
        try {
          const { SIM_RESOURCES } = await import('@/config/simResources');
          const cfg = SIM_RESOURCES[gameTitle];
          await supabase
            .from('game_channels')
            .upsert(
              {
                game_title: gameTitle,
                name: cfg?.title ?? gameTitle.replace(/_/g, ' '),
                accent_color: cfg?.accentColor ?? '#94A3B8',
              },
              { onConflict: 'game_title', ignoreDuplicates: true },
            );
        } catch (e) {
          console.warn('game_channels auto-upsert skipped:', e);
        }

        // Insert tasks if imported from FGN challenge
        if (newWO && pendingTasks.length > 0) {
          const taskRows = pendingTasks.map((t, idx) => ({
            work_order_id: newWO.id,
            title: t.title,
            description: t.description || null,
            order_index: t.display_order ?? idx,
            source_task_id: t.id ?? null,
          }));


          const { error: taskError } = await supabase
            .from('work_order_tasks')
            .insert(taskRows);

          if (taskError) {
            console.error('Error inserting tasks:', taskError);
            toast({
              title: 'Warning',
              description: 'Work order created but tasks failed to import.',
              variant: 'destructive',
            });
          }
        }

        toast({
          title: 'Created',
          description: `New work order created${pendingTasks.length > 0 ? ` with ${pendingTasks.length} tasks` : ''}.`,
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

  const handleImportChallenge = (data: MappedChallengeData) => {
    setTitle(data.title);
    setDescription(data.description);
    setGameTitle(data.gameTitle);
    setDifficulty(data.difficulty);
    setXpReward(data.xpReward);
    setEstimatedTime(data.estimatedTime?.toString() || '');
    setCoverImageUrl(data.coverImageUrl || '');
    setFgnOriginChallengeId(data.fgnOriginChallengeId);
    setIsActive(false);
    setPendingTasks(data.tasks || []);
    setPendingPlaySource(data.playSource ?? null);

    // Evidence auto-prefill from upstream play_source.requires_evidence
    // (only when admin hasn't manually toggled evidence in this session)
    const requiresEvidence =
      data.playSource &&
      (data.playSource as { requires_evidence?: boolean }).requires_evidence === true;
    if (requiresEvidence && !evidenceUserOverridden) {
      setEvidenceRequired(true);
      setEvidenceMinUploads('1');
      setEvidenceMaxUploads('5');
      setEvidenceAllowedTypes(['image', 'video', 'document']);
      setEvidenceInstructions('');
      setEvidenceDeadlineHours('');
      setEvidenceOpen(true);
    }

    toast({
      title: 'Challenge Imported',
      description: `"${data.title}" data loaded${data.tasks.length > 0 ? ` with ${data.tasks.length} tasks` : ''}. Review and save to create the work order.`,
    });
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
          {/* Import from FGN button (create mode only) */}
          {!workOrder && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Import from FGN Challenges
            </Button>
          )}

          {fgnOriginChallengeId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
              <Download className="h-3 w-3" />
              Linked to FGN Challenge: <code className="text-primary">{fgnOriginChallengeId.slice(0, 8)}...</code>
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} will be imported:
              </p>
              <ul className="space-y-1">
                {pendingTasks.map((t, i) => (
                  <li key={t.id || i} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                      {i + 1}
                    </span>
                    {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {/* Cover Image */}
          <div className="space-y-3">
            <Label>Cover Image (Optional)</Label>
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
              {coverImageUrl ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No cover image set</p>
                      <p className="text-xs text-muted-foreground">Falls back to game cover</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Add Cover Image
                  </Button>
                </div>
              )}
            </div>
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
                  {Array.from(
                    new Map(
                      channels.map((c) => [c.game_title, c.name] as const),
                    ).entries(),
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
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

          {/* Community and Channel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Community</Label>
              <Select value={tenantId || 'none'} onValueChange={(v) => setTenantId(v === 'none' ? '' : v)}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="All communities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Communities (Global)</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign to a specific community or leave global.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Game Channel</Label>
              <Select value={channelId || 'none'} onValueChange={(v) => setChannelId(v === 'none' ? '' : v)}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select channel (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredChannels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Evidence Requirements */}
          <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <FileUp className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <Label className="font-medium cursor-pointer">Evidence Requirements</Label>
                    <p className="text-sm text-muted-foreground">
                      Require users to upload proof of completion
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {evidenceRequired && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                      Required
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${evidenceOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                  {/* Enable Evidence Toggle */}
                  <div className="flex items-center justify-between pt-4">
                    <Label htmlFor="evidence-required" className="text-sm">
                      Require evidence submission
                    </Label>
                    <Switch
                      id="evidence-required"
                      checked={evidenceRequired}
                      onCheckedChange={(v) => {
                        setEvidenceUserOverridden(true);
                        setEvidenceRequired(v);
                      }}
                    />

                  </div>

                  {evidenceRequired && (
                    <>
                      {/* Upload Limits */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-uploads" className="text-sm font-normal text-muted-foreground">
                            Minimum files
                          </Label>
                          <Input
                            id="min-uploads"
                            type="number"
                            min={1}
                            max={10}
                            value={evidenceMinUploads}
                            onChange={(e) => setEvidenceMinUploads(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max-uploads" className="text-sm font-normal text-muted-foreground">
                            Maximum files
                          </Label>
                          <Input
                            id="max-uploads"
                            type="number"
                            min={1}
                            max={20}
                            value={evidenceMaxUploads}
                            onChange={(e) => setEvidenceMaxUploads(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Allowed File Types */}
                      <div className="space-y-2">
                        <Label className="text-sm font-normal text-muted-foreground">
                          Allowed file types
                        </Label>
                        <div className="flex flex-wrap gap-4">
                          {(['image', 'video', 'document'] as const).map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`type-${type}`}
                                checked={evidenceAllowedTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEvidenceAllowedTypes([...evidenceAllowedTypes, type]);
                                  } else {
                                    setEvidenceAllowedTypes(
                                      evidenceAllowedTypes.filter((t) => t !== type)
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`type-${type}`}
                                className="text-sm font-normal capitalize cursor-pointer"
                              >
                                {type === 'image' ? 'Images (jpg, png, webp)' :
                                 type === 'video' ? 'Videos (mp4, mov)' :
                                 'Documents (pdf, doc)'}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-2">
                        <Label htmlFor="evidence-instructions" className="text-sm font-normal text-muted-foreground">
                          Instructions for users
                        </Label>
                        <Textarea
                          id="evidence-instructions"
                          value={evidenceInstructions}
                          onChange={(e) => setEvidenceInstructions(e.target.value)}
                          placeholder="E.g., Upload a screenshot of your completed delivery showing the score screen..."
                          rows={2}
                        />
                      </div>

                      {/* Deadline */}
                      <div className="space-y-2">
                        <Label htmlFor="deadline-hours" className="text-sm font-normal text-muted-foreground">
                          Submission deadline (hours after completion, optional)
                        </Label>
                        <Input
                          id="deadline-hours"
                          type="number"
                          min={1}
                          value={evidenceDeadlineHours}
                          onChange={(e) => setEvidenceDeadlineHours(e.target.value)}
                          placeholder="No deadline"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

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

        <MediaPickerDialog
          open={showMediaPicker}
          onOpenChange={setShowMediaPicker}
          onSelect={(url) => {
            setCoverImageUrl(url);
            setShowMediaPicker(false);
          }}
          title="Select Cover Image"
          currentImageUrl={coverImageUrl}
          workOrderId={workOrder?.id}
        />

        <ImportChallengeDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onSelect={handleImportChallenge}
        />
      </DialogContent>
    </Dialog>
  );
}
