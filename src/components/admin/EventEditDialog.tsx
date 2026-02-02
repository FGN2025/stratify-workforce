import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

type EventStatus = Database['public']['Enums']['event_status'];
type EventType = Database['public']['Enums']['event_type'];
type GameTitle = Database['public']['Enums']['game_title'];

interface WorkOrder {
  id: string;
  title: string;
  game_title: GameTitle;
  xp_reward: number;
}

interface Tenant {
  id: string;
  name: string;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  scheduled_start: string;
  scheduled_end: string;
  registration_deadline: string | null;
  min_participants: number | null;
  max_participants: number | null;
  status: EventStatus;
  work_order_id: string | null;
  tenant_id: string | null;
  work_order?: WorkOrder | null;
}

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventData | null;
  onSave: () => void;
}

export function EventEditDialog({
  open,
  onOpenChange,
  event,
  onSave,
}: EventEditDialogProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('quest');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [minParticipants, setMinParticipants] = useState('2');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [workOrderId, setWorkOrderId] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Fetch work orders and tenants on mount
  useEffect(() => {
    const fetchData = async () => {
      const [workOrdersRes, tenantsRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select('id, title, game_title, xp_reward')
          .eq('is_active', true)
          .order('title'),
        supabase.from('tenants').select('id, name').order('name'),
      ]);

      if (workOrdersRes.data) setWorkOrders(workOrdersRes.data);
      if (tenantsRes.data) setTenants(tenantsRes.data);
    };
    fetchData();
  }, []);

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setEventType(event.event_type);
        setScheduledStart(formatDateTimeLocal(event.scheduled_start));
        setScheduledEnd(formatDateTimeLocal(event.scheduled_end));
        setRegistrationDeadline(
          event.registration_deadline ? formatDateTimeLocal(event.registration_deadline) : ''
        );
        setMinParticipants(event.min_participants?.toString() || '2');
        setMaxParticipants(event.max_participants?.toString() || '');
        setStatus(event.status);
        setWorkOrderId(event.work_order_id || '');
        setTenantId(event.tenant_id || '');
      } else {
        // Reset to defaults for create mode
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const endTime = new Date(threeDaysLater.getTime() + 2 * 60 * 60 * 1000);

        setTitle('');
        setDescription('');
        setEventType('quest');
        setScheduledStart(formatDateTimeLocal(threeDaysLater.toISOString()));
        setScheduledEnd(formatDateTimeLocal(endTime.toISOString()));
        setRegistrationDeadline('');
        setMinParticipants('2');
        setMaxParticipants('');
        setStatus('draft');
        setWorkOrderId('');
        setTenantId('');
      }
    }
  }, [open, event]);

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

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

    if (!scheduledStart || !scheduledEnd) {
      toast({
        title: 'Validation Error',
        description: 'Start and end times are required.',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      toast({
        title: 'Validation Error',
        description: 'End time must be after start time.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create events.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
        registration_deadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : null,
        min_participants: minParticipants ? parseInt(minParticipants, 10) : 1,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        status,
        work_order_id: workOrderId || null,
        tenant_id: tenantId || null,
      };

      if (event) {
        // Update existing
        const { error } = await supabase
          .from('events')
          .update(data)
          .eq('id', event.id);

        if (error) throw error;

        toast({
          title: 'Updated',
          description: 'Event has been updated.',
        });
      } else {
        // Create new
        const { error } = await supabase.from('events').insert({
          ...data,
          created_by: user.id,
        });

        if (error) throw error;

        toast({
          title: 'Created',
          description: 'New event has been created.',
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedWorkOrder = workOrders.find(wo => wo.id === workOrderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
          <DialogDescription>
            {event
              ? 'Update the event details below.'
              : 'Schedule a new gaming competition or quest.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the event objectives and rules"
              rows={3}
            />
          </div>

          {/* Event Type and Work Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type *</Label>
              <Select value={eventType} onValueChange={v => setEventType(v as EventType)}>
                <SelectTrigger id="eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quest">Quest (Multi-player)</SelectItem>
                  <SelectItem value="head_to_head">Head-to-Head (Bracket)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workOrder">Linked Work Order</Label>
              <Select value={workOrderId} onValueChange={setWorkOrderId}>
                <SelectTrigger id="workOrder">
                  <SelectValue placeholder="Select work order (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {workOrders.map(wo => (
                    <SelectItem key={wo.id} value={wo.id}>
                      {wo.title} ({wo.game_title.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWorkOrder && (
                <p className="text-xs text-muted-foreground">
                  XP Reward: {selectedWorkOrder.xp_reward} • Game:{' '}
                  {selectedWorkOrder.game_title.replace('_', ' ')}
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label>Schedule *</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-sm font-normal text-muted-foreground">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={e => setScheduledStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-sm font-normal text-muted-foreground">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={e => setScheduledEnd(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Registration Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Registration Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={registrationDeadline}
              onChange={e => setRegistrationDeadline(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to allow registration until the event starts
            </p>
          </div>

          {/* Participants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minParticipants">Min Participants</Label>
              <Input
                id="minParticipants"
                type="number"
                min={1}
                value={minParticipants}
                onChange={e => setMinParticipants(e.target.value)}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                value={maxParticipants}
                onChange={e => setMaxParticipants(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {/* Status and Community */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={v => setStatus(v as EventStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="registration_open">Registration Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {event ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
