import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  ArrowLeft, 
  Swords, 
  Target,
  ExternalLink,
  Share2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { XPRewardBadge } from '@/components/work-orders/XPRewardBadge';
import { GameIcon } from '@/components/dashboard/GameIcon';
import { DifficultyIndicator } from '@/components/work-orders/DifficultyIndicator';
import { EventRegistrationButton } from '@/components/events/EventRegistrationButton';
import { EventBracket } from '@/components/events/EventBracket';
import { ParticipantList } from '@/components/events/ParticipantList';
import { useEventById } from '@/hooks/useEventById';
import { cn } from '@/lib/utils';
import type { EventStatus } from '@/types/events';

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Coming Soon', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  registration_open: { label: 'Registration Open', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  in_progress: { label: 'Live Now', className: 'bg-primary/20 text-primary border-primary/30 animate-pulse' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

// Generate Google Calendar URL
function generateGoogleCalendarUrl(event: {
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
}) {
  const formatGcalDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGcalDate(event.scheduled_start)}/${formatGcalDate(event.scheduled_end)}`,
    details: event.description || '',
    location: 'FGN Academy Online',
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEventById(id || '');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (error || !event) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate('/events')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div className="text-center py-12">
            <p className="text-destructive">Event not found</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const startDate = new Date(event.scheduled_start);
  const endDate = new Date(event.scheduled_end);
  const registrationDeadline = event.registration_deadline 
    ? new Date(event.registration_deadline) 
    : null;

  const isLive = event.status === 'in_progress';
  const isUpcoming = isFuture(startDate);
  const hasEnded = isPast(endDate);
  const registrationOpen = event.status === 'registration_open';
  const spotsLeft = event.max_participants 
    ? event.max_participants - (event.registration_count || 0) 
    : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  const statusInfo = statusConfig[event.status];
  const gcalUrl = generateGoogleCalendarUrl(event);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/events')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <Card className="overflow-hidden">
              {/* Game color strip */}
              {event.work_order && (
                <div
                  className={cn(
                    'h-2',
                    event.work_order.game_title === 'ATS' && 'bg-blue-500',
                    event.work_order.game_title === 'Farming_Sim' && 'bg-green-500',
                    event.work_order.game_title === 'Construction_Sim' && 'bg-amber-500',
                    event.work_order.game_title === 'Mechanic_Sim' && 'bg-red-500'
                  )}
                />
              )}

              <CardContent className="pt-6">
                {/* Status and type badges */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className={cn('text-sm', statusInfo.className)}>
                    {statusInfo.label}
                  </Badge>
                  <Badge variant="outline" className="text-sm border-border bg-background">
                    {event.event_type === 'head_to_head' ? (
                      <><Swords className="h-3.5 w-3.5 mr-1" />Head-to-Head</>
                    ) : (
                      <><Target className="h-3.5 w-3.5 mr-1" />Quest</>
                    )}
                  </Badge>
                </div>

                {/* Title and game */}
                <div className="flex items-start gap-4 mb-6">
                  {event.work_order && (
                    <GameIcon game={event.work_order.game_title} size="lg" />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">{event.title}</h1>
                    {event.work_order && (
                      <p className="text-muted-foreground">
                        Work Order: {event.work_order.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-muted-foreground mb-6">{event.description}</p>
                )}

                {/* Stats row */}
                {event.work_order && (
                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
                    <XPRewardBadge xp={event.work_order.xp_reward} size="lg" />
                    <DifficultyIndicator difficulty={event.work_order.difficulty} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time</p>
                    <p className="font-medium">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </p>
                  </div>
                </div>

                {registrationDeadline && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">Registration Deadline</p>
                    <p className={cn(
                      'font-medium',
                      isPast(registrationDeadline) ? 'text-destructive' : 'text-foreground'
                    )}>
                      {format(registrationDeadline, 'MMMM d, yyyy h:mm a')}
                      {isPast(registrationDeadline) && ' (Closed)'}
                    </p>
                  </div>
                )}

                {/* Countdown */}
                {isUpcoming && !hasEnded && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">
                      {isLive ? 'Status' : 'Starts In'}
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      {isLive ? '🔴 Live Now!' : formatDistanceToNow(startDate, { addSuffix: false })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants list with avatars and status */}
            <ParticipantList 
              eventId={event.id} 
              maxParticipants={event.max_participants} 
            />

            {/* Bracket for H2H events */}
            {event.event_type === 'head_to_head' && (
              <EventBracket 
                eventId={event.id} 
                eventStatus={event.status} 
                minParticipants={event.min_participants}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration card */}
            <Card className="sticky top-6">
              <CardContent className="pt-6">
                <EventRegistrationButton event={event} />

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" asChild>
                    <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </a>
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick info */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium">
                    {event.event_type === 'head_to_head' ? 'Head-to-Head' : 'Quest'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Min Players</span>
                  <span className="text-sm font-medium font-data">{event.min_participants}</span>
                </div>
                {event.max_participants && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Max Players</span>
                    <span className="text-sm font-medium font-data">{event.max_participants}</span>
                  </div>
                )}
                {event.work_order && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Game</span>
                      <span className="text-sm font-medium">
                        {event.work_order.game_title.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Difficulty</span>
                      <DifficultyIndicator difficulty={event.work_order.difficulty} size="sm" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
