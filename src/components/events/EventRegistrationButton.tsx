import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useEventRegistration } from '@/hooks/useEventRegistration';
import { useAuth } from '@/contexts/AuthContext';
import { isPast } from 'date-fns';
import type { EventWithDetails } from '@/types/events';

interface EventRegistrationButtonProps {
  event: EventWithDetails;
}

export function EventRegistrationButton({ event }: EventRegistrationButtonProps) {
  const { user } = useAuth();
  const {
    registration,
    isLoading,
    isRegistered,
    wasCancelled,
    register,
    unregister,
    isRegistering,
    isUnregistering,
  } = useEventRegistration(event.id);

  const registrationDeadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : null;
  const deadlinePassed = registrationDeadline ? isPast(registrationDeadline) : false;
  const eventEnded = isPast(new Date(event.scheduled_end));
  const registrationOpen = event.status === 'registration_open';
  
  const spotsLeft = event.max_participants
    ? event.max_participants - (event.registration_count || 0)
    : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  // Not logged in
  if (!user) {
    return (
      <div className="space-y-3">
        <Button className="w-full" size="lg" disabled>
          Sign in to Register
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          You must be logged in to register for events
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button className="w-full" size="lg" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  // Already registered
  if (isRegistered) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-green-500 py-2">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">You're registered!</span>
        </div>
        {!eventEnded && !deadlinePassed && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => unregister()}
            disabled={isUnregistering}
          >
            {isUnregistering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cancelling...
              </>
            ) : (
              'Cancel Registration'
            )}
          </Button>
        )}
        <p className="text-xs text-center text-muted-foreground">
          Earn {event.work_order?.xp_reward || 0} XP by participating
        </p>
      </div>
    );
  }

  // Previously cancelled
  if (wasCancelled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Registration cancelled</span>
        </div>
        {registrationOpen && !isFull && !deadlinePassed && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => register()}
            disabled={isRegistering}
          >
            {isRegistering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registering...
              </>
            ) : (
              'Register Again'
            )}
          </Button>
        )}
      </div>
    );
  }

  // Event ended
  if (eventEnded) {
    return (
      <Button className="w-full" size="lg" disabled>
        Event Ended
      </Button>
    );
  }

  // Registration deadline passed
  if (deadlinePassed) {
    return (
      <div className="space-y-3">
        <Button className="w-full" size="lg" disabled>
          <Clock className="h-4 w-4 mr-2" />
          Registration Closed
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          The registration deadline has passed
        </p>
      </div>
    );
  }

  // Event is full
  if (isFull) {
    return (
      <div className="space-y-3">
        <Button className="w-full" size="lg" disabled>
          Event Full
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          All spots have been taken
        </p>
      </div>
    );
  }

  // Registration not open yet
  if (!registrationOpen) {
    return (
      <div className="space-y-3">
        <Button className="w-full" size="lg" disabled>
          Registration Not Open
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Check back when registration opens
        </p>
      </div>
    );
  }

  // Can register
  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        size="lg"
        onClick={() => register()}
        disabled={isRegistering}
      >
        {isRegistering ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Registering...
          </>
        ) : (
          'Register Now'
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Free to join • Earn {event.work_order?.xp_reward || 0} XP
      </p>
      {spotsLeft !== null && spotsLeft <= 10 && (
        <div className="flex justify-center">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Only {spotsLeft} spots left!
          </Badge>
        </div>
      )}
    </div>
  );
}
