import { Users, Clock, CheckCircle, XCircle, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventRegistrations } from '@/hooks/useEventById';
import { cn } from '@/lib/utils';
import type { RegistrationStatus } from '@/types/events';

interface ParticipantListProps {
  eventId: string;
  maxParticipants?: number | null;
}

const statusConfig: Record<RegistrationStatus, { 
  label: string; 
  icon: React.ElementType; 
  className: string;
}> = {
  registered: { 
    label: 'Registered', 
    icon: CheckCircle, 
    className: 'bg-green-500/20 text-green-400 border-green-500/30' 
  },
  confirmed: { 
    label: 'Confirmed', 
    icon: CheckCircle, 
    className: 'bg-primary/20 text-primary border-primary/30' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: XCircle, 
    className: 'bg-destructive/20 text-destructive border-destructive/30' 
  },
  no_show: { 
    label: 'No Show', 
    icon: UserX, 
    className: 'bg-muted text-muted-foreground border-border' 
  },
};

function ParticipantSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ParticipantList({ eventId, maxParticipants }: ParticipantListProps) {
  const { data: registrations, isLoading, error } = useEventRegistrations(eventId);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load participants</p>
        </CardContent>
      </Card>
    );
  }

  const participantCount = registrations?.length || 0;
  const spotsLeft = maxParticipants ? maxParticipants - participantCount : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Participants
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-data">
              <span className="text-foreground font-semibold">{participantCount}</span>
              {maxParticipants && (
                <span className="text-muted-foreground">/{maxParticipants}</span>
              )}
            </span>
            {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
              <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                {spotsLeft} left
              </Badge>
            )}
            {spotsLeft !== null && spotsLeft <= 0 && (
              <Badge variant="outline" className="text-xs bg-destructive/20 text-destructive border-destructive/30">
                Full
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-1">
            <ParticipantSkeleton />
            <ParticipantSkeleton />
            <ParticipantSkeleton />
          </div>
        ) : participantCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No participants yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to register!
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-1">
              {registrations?.map((registration, index) => {
                const StatusIcon = statusConfig[registration.status].icon;
                const statusInfo = statusConfig[registration.status];
                
                return (
                  <div
                    key={registration.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg transition-colors',
                      'hover:bg-muted/50',
                      index === 0 && 'bg-primary/5'
                    )}
                  >
                    {/* Rank/Seed number */}
                    <div className="w-6 text-center">
                      <span className={cn(
                        'text-sm font-data',
                        index === 0 ? 'text-primary font-semibold' : 'text-muted-foreground'
                      )}>
                        #{registration.bracket_seed || index + 1}
                      </span>
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border-2 border-border">
                      <AvatarImage src={registration.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm font-medium">
                        {registration.profile?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {registration.profile?.username || 'Unknown Player'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(registration.registered_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Status badge */}
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs gap-1', statusInfo.className)}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
