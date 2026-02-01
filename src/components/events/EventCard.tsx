import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { Calendar, Clock, Users, Swords, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XPRewardBadge } from '@/components/work-orders/XPRewardBadge';
import { GameIcon } from '@/components/dashboard/GameIcon';
import { cn } from '@/lib/utils';
import type { EventWithDetails, EventStatus } from '@/types/events';

interface EventCardProps {
  event: EventWithDetails;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Coming Soon', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  registration_open: { label: 'Open', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  in_progress: { label: 'Live', className: 'bg-primary/20 text-primary border-primary/30 animate-pulse' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export function EventCard({ event, onClick, isSelected, compact = false }: EventCardProps) {
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

  const statusInfo = statusConfig[event.status];

  if (compact) {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all hover:bg-accent/50 border-border/50',
          isSelected && 'ring-2 ring-primary border-primary',
          isLive && 'border-primary/50'
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {event.work_order && (
              <div className="flex-shrink-0">
                <GameIcon game={event.work_order.game_title} size="sm" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{event.title}</h4>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(startDate, 'h:mm a')}
                </span>
                {event.work_order && (
                  <XPRewardBadge xp={event.work_order.xp_reward} size="sm" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 border-border/50 overflow-hidden',
        isSelected && 'ring-2 ring-primary border-primary',
        isLive && 'border-primary/50 shadow-lg shadow-primary/10'
      )}
      onClick={onClick}
    >
      {/* Header strip with game color */}
      {event.work_order && (
        <div
          className={cn(
            'h-1.5',
            event.work_order.game_title === 'ATS' && 'bg-blue-500',
            event.work_order.game_title === 'Farming_Sim' && 'bg-green-500',
            event.work_order.game_title === 'Construction_Sim' && 'bg-amber-500',
            event.work_order.game_title === 'Mechanic_Sim' && 'bg-red-500'
          )}
        />
      )}

      <CardContent className="p-4">
        {/* Top row: Status + Type */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
            {statusInfo.label}
          </Badge>
          <Badge variant="outline" className="text-xs border-border bg-background">
            {event.event_type === 'head_to_head' ? (
              <><Swords className="h-3 w-3 mr-1" />H2H</>
            ) : (
              <><Target className="h-3 w-3 mr-1" />Quest</>
            )}
          </Badge>
        </div>

        {/* Title and game */}
        <div className="flex items-start gap-3 mb-3">
          {event.work_order && (
            <GameIcon game={event.work_order.game_title} size="md" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate mb-1">{event.title}</h3>
            {event.work_order && (
              <p className="text-xs text-muted-foreground">
                {event.work_order.title}
              </p>
            )}
          </div>
        </div>

        {/* Date and time */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
            </span>
          </div>
        </div>

        {/* Countdown or status text */}
        {isUpcoming && !hasEnded && (
          <p className="text-xs text-primary mb-3">
            {isLive ? 'Happening now!' : `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`}
          </p>
        )}

        {/* Bottom row: Participants + XP */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-data">
              {event.registration_count || 0}
              {event.max_participants && ` / ${event.max_participants}`}
            </span>
            {registrationOpen && spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
              <span className="text-amber-400 text-xs ml-1">
                ({spotsLeft} spots left)
              </span>
            )}
            {spotsLeft === 0 && (
              <span className="text-destructive text-xs ml-1">Full</span>
            )}
          </div>
          {event.work_order && (
            <XPRewardBadge xp={event.work_order.xp_reward} size="md" />
          )}
        </div>

        {/* Registration deadline warning */}
        {registrationOpen && registrationDeadline && isFuture(registrationDeadline) && (
          <p className="text-xs text-amber-400 mt-2">
            Register by {format(registrationDeadline, 'MMM d, h:mm a')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
