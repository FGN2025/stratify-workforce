import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, Filter, List, Grid3X3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EventCalendar } from '@/components/events/EventCalendar';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvents, useEventsByDate } from '@/hooks/useEvents';
import type { EventFilters, EventStatus, EventType } from '@/types/events';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

const gameOptions: { value: GameTitle | 'all'; label: string }[] = [
  { value: 'all', label: 'All Games' },
  { value: 'ATS', label: 'American Truck Sim' },
  { value: 'Farming_Sim', label: 'Farming Simulator' },
  { value: 'Construction_Sim', label: 'Construction Sim' },
  { value: 'Mechanic_Sim', label: 'Mechanic Simulator' },
];

const statusOptions: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'registration_open', label: 'Open Registration' },
  { value: 'in_progress', label: 'Live Now' },
  { value: 'published', label: 'Coming Soon' },
  { value: 'completed', label: 'Completed' },
];

const typeOptions: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'quest', label: 'Quests' },
  { value: 'head_to_head', label: 'Head-to-Head' },
];

export default function Events() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filters, setFilters] = useState<EventFilters>({
    status: 'all',
    event_type: 'all',
    game_title: 'all',
  });

  // Fetch all events for the calendar view
  const { data: allEvents = [], isLoading: eventsLoading } = useEvents(filters);

  // Fetch events for selected date
  const { data: selectedDateEvents = [], isLoading: dateEventsLoading } = useEventsByDate(selectedDate);

  // Get events for the visible month in calendar
  const currentMonthStart = startOfMonth(selectedDate);
  const currentMonthEnd = endOfMonth(selectedDate);

  // Filter events for current month (for calendar indicators)
  const monthEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const eventDate = new Date(event.scheduled_start);
      return eventDate >= currentMonthStart && eventDate <= currentMonthEnd;
    });
  }, [allEvents, currentMonthStart, currentMonthEnd]);

  // Upcoming events for list view
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents
      .filter((e) => new Date(e.scheduled_start) >= now)
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }, [allEvents]);

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scheduled Events</h1>
            <p className="text-muted-foreground">
              Browse and register for upcoming gaming events
            </p>
          </div>

          {/* View toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
            <TabsList>
              <TabsTrigger value="calendar" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-lg bg-card border border-border">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          <Select
            value={filters.game_title || 'all'}
            onValueChange={(v) => handleFilterChange('game_title', v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Games" />
            </SelectTrigger>
            <SelectContent>
              {gameOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(v) => handleFilterChange('status', v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.event_type || 'all'}
            onValueChange={(v) => handleFilterChange('event_type', v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-1">
              {eventsLoading ? (
                <Skeleton className="h-[400px] rounded-lg" />
              ) : (
                <EventCalendar
                  events={monthEvents}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}
            </div>

            {/* Selected day events */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
              </div>

              {dateEventsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[120px] rounded-lg" />
                  ))}
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/50">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No events scheduled for this day</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Select another date or check the list view
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleEventClick(event.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Upcoming Events ({upcomingEvents.length})
            </h2>

            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-[200px] rounded-lg" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/50">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No upcoming events match your filters</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setFilters({ status: 'all', event_type: 'all', game_title: 'all' })}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
