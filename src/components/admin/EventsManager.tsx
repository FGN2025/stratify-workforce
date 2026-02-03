import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Edit, Trash2, Calendar, Users, Swords, Target } from 'lucide-react';
import { EventEditDialog } from './EventEditDialog';
import type { Database } from '@/integrations/supabase/types';

type EventStatus = Database['public']['Enums']['event_status'];
type EventType = Database['public']['Enums']['event_type'];
type GameTitle = Database['public']['Enums']['game_title'];

interface EventWithDetails {
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
  created_at: string;
  work_order?: {
    id: string;
    title: string;
    game_title: GameTitle;
    xp_reward: number;
  } | null;
  registration_count?: number;
}

const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Published', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  registration_open: { label: 'Registration Open', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-primary/20 text-primary border-primary/30' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const GAME_LABELS: Record<GameTitle, string> = {
  ATS: 'ATS',
  Farming_Sim: 'Farming',
  Construction_Sim: 'Construction',
  Mechanic_Sim: 'Mechanic',
  Fiber_Tech: 'Fiber-Tech',
};

export function EventsManager() {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Fetch events with work order details
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          work_order:work_orders(id, title, game_title, xp_reward)
        `)
        .order('scheduled_start', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch registration counts
      const eventIds = eventsData?.map(e => e.id) || [];
      const { data: regCounts } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'registered');

      // Count registrations per event
      const countMap = new Map<string, number>();
      regCounts?.forEach(r => {
        countMap.set(r.event_id, (countMap.get(r.event_id) || 0) + 1);
      });

      const eventsWithCounts = eventsData?.map(e => ({
        ...e,
        registration_count: countMap.get(e.id) || 0,
      })) || [];

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: EventStatus) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setEvents(prev =>
        prev.map(e => (e.id === id ? { ...e, status: newStatus } : e))
      );

      toast({
        title: 'Status Updated',
        description: `Event status changed to ${STATUS_CONFIG[newStatus].label}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
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
      const { error } = await supabase.from('events').delete().eq('id', deleteId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== deleteId));
      toast({
        title: 'Deleted',
        description: 'Event has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleSave = async () => {
    await fetchEvents();
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  const handleEdit = (event: EventWithDetails) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesType = typeFilter === 'all' || e.event_type === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [events, statusFilter, typeFilter]);

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
          {[1, 2, 3, 4, 5].map(i => (
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
          <h3 className="text-lg font-semibold">Events Management</h3>
          <p className="text-sm text-muted-foreground">
            Schedule and manage gaming competitions and quests
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={v => setStatusFilter(v as EventStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="registration_open">Registration Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={v => setTypeFilter(v as EventType | 'all')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="quest">Quest</SelectItem>
            <SelectItem value="head_to_head">Head-to-Head</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== 'all' || typeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredEvents.length} of {events.length} events
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-center">Participants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map(event => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="truncate">{event.title}</div>
                    {event.work_order && (
                      <div className="text-xs text-muted-foreground truncate">
                        {event.work_order.title}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {event.event_type === 'head_to_head' ? (
                        <>
                          <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">H2H</span>
                        </>
                      ) : (
                        <>
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">Quest</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.work_order ? (
                      <span className="text-sm">{GAME_LABELS[event.work_order.game_title]}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{format(new Date(event.scheduled_start), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(event.scheduled_start), 'h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-data">
                        {event.registration_count || 0}
                        {event.max_participants && `/${event.max_participants}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={event.status}
                      onValueChange={v => handleStatusChange(event.id, v as EventStatus)}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <Badge
                          variant="outline"
                          className={STATUS_CONFIG[event.status].className}
                        >
                          {STATUS_CONFIG[event.status].label}
                        </Badge>
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
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(event.id)}
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

      {/* Edit/Create Dialog */}
      <EventEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        event={editingEvent}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event
              and remove all associated registrations.
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
