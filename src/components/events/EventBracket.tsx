import { useState } from 'react';
import { Trophy, User, ChevronRight, Shuffle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useEventBracket, useUpdateMatch } from '@/hooks/useEventMatches';
import { useEventRegistrations } from '@/hooks/useEventById';
import { useBracketGeneration } from '@/hooks/useBracketGeneration';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import type { EventMatchWithPlayers } from '@/types/events';

interface EventBracketProps {
  eventId: string;
  eventStatus: string;
  minParticipants?: number;
}

interface MatchCardProps {
  match: EventMatchWithPlayers;
  roundName: string;
  canEdit: boolean;
  currentUserId: string | undefined;
  onRecordResult: (match: EventMatchWithPlayers) => void;
}

function getRoundName(roundNumber: number, totalRounds: number): string {
  if (roundNumber === 1) return 'Finals';
  if (roundNumber === 2) return 'Semi-Finals';
  if (roundNumber === 3) return 'Quarter-Finals';
  return `Round of ${Math.pow(2, roundNumber)}`;
}

function PlayerSlot({
  player,
  score,
  isWinner,
  isBye,
  isCurrentUser,
}: {
  player: { id: string; username: string | null; avatar_url: string | null } | null | undefined;
  score: number | null;
  isWinner: boolean;
  isBye: boolean;
  isCurrentUser: boolean;
}) {
  if (isBye) {
    return (
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-dashed border-border/50">
        <span className="text-sm text-muted-foreground italic">BYE</span>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-dashed border-border/50">
        <span className="text-sm text-muted-foreground italic">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded border transition-colors',
        isWinner && 'bg-primary/10 border-primary/30',
        !isWinner && 'bg-background border-border',
        isCurrentUser && 'ring-1 ring-primary/50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-6 w-6">
          <AvatarImage src={player.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {player.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'text-sm truncate',
            isWinner ? 'font-semibold text-primary' : 'text-foreground'
          )}
        >
          {player.username || 'Unknown'}
        </span>
        {isWinner && <Trophy className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
      </div>
      {score !== null && (
        <span
          className={cn(
            'text-sm font-data ml-2',
            isWinner ? 'font-bold text-primary' : 'text-muted-foreground'
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match, roundName, canEdit, currentUserId, onRecordResult }: MatchCardProps) {
  const isCompleted = match.status === 'completed';
  const isInProgress = match.status === 'in_progress';
  const player1IsWinner = match.winner_id === match.player1_id;
  const player2IsWinner = match.winner_id === match.player2_id;
  const player1IsBye = !match.player1_id && !!match.player2_id;
  const player2IsBye = !!match.player1_id && !match.player2_id;
  const isUserMatch =
    currentUserId && (match.player1_id === currentUserId || match.player2_id === currentUserId);

  const bothPlayersAssigned = match.player1_id && match.player2_id;

  return (
    <div
      className={cn(
        'relative bg-card border rounded-lg p-3 w-56 shadow-sm',
        isUserMatch && 'ring-2 ring-primary/50',
        isInProgress && 'border-primary/50'
      )}
    >
      {/* Match status indicator */}
      {isInProgress && (
        <Badge
          variant="outline"
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-primary/20 text-primary border-primary/30"
        >
          Live
        </Badge>
      )}

      <div className="space-y-2">
        <PlayerSlot
          player={match.player1}
          score={match.player1_score}
          isWinner={player1IsWinner}
          isBye={player1IsBye}
          isCurrentUser={currentUserId === match.player1_id}
        />
        <div className="flex items-center justify-center">
          <span className="text-xs text-muted-foreground">vs</span>
        </div>
        <PlayerSlot
          player={match.player2}
          score={match.player2_score}
          isWinner={player2IsWinner}
          isBye={player2IsBye}
          isCurrentUser={currentUserId === match.player2_id}
        />
      </div>

      {/* Admin record result button */}
      {canEdit && !isCompleted && bothPlayersAssigned && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 text-xs"
          onClick={() => onRecordResult(match)}
        >
          Record Result
        </Button>
      )}
    </div>
  );
}

function RecordResultDialog({
  match,
  open,
  onOpenChange,
}: {
  match: EventMatchWithPlayers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [player1Score, setPlayer1Score] = useState<string>('');
  const [player2Score, setPlayer2Score] = useState<string>('');
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const updateMatch = useUpdateMatch();

  const handleSubmit = () => {
    if (!match || !winnerId) return;

    updateMatch.mutate(
      {
        matchId: match.id,
        winnerId,
        player1Score: player1Score ? parseInt(player1Score, 10) : undefined,
        player2Score: player2Score ? parseInt(player2Score, 10) : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPlayer1Score('');
          setPlayer2Score('');
          setWinnerId(null);
        },
      }
    );
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Match Result</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Player 1 */}
          <div
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-colors',
              winnerId === match.player1_id
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border hover:border-primary/50'
            )}
            onClick={() => setWinnerId(match.player1_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={match.player1?.avatar_url || undefined} />
                  <AvatarFallback>
                    {match.player1?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{match.player1?.username || 'Unknown'}</span>
                {winnerId === match.player1_id && <Trophy className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="p1score" className="sr-only">
                  Score
                </Label>
                <Input
                  id="p1score"
                  type="number"
                  min="0"
                  value={player1Score}
                  onChange={e => setPlayer1Score(e.target.value)}
                  className="w-20 text-center"
                  placeholder="Score"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">vs</div>

          {/* Player 2 */}
          <div
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-colors',
              winnerId === match.player2_id
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border hover:border-primary/50'
            )}
            onClick={() => setWinnerId(match.player2_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={match.player2?.avatar_url || undefined} />
                  <AvatarFallback>
                    {match.player2?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{match.player2?.username || 'Unknown'}</span>
                {winnerId === match.player2_id && <Trophy className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="p2score" className="sr-only">
                  Score
                </Label>
                <Input
                  id="p2score"
                  type="number"
                  min="0"
                  value={player2Score}
                  onChange={e => setPlayer2Score(e.target.value)}
                  className="w-20 text-center"
                  placeholder="Score"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Click on a player to select them as the winner. Scores are optional.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!winnerId || updateMatch.isPending}>
            {updateMatch.isPending ? 'Saving...' : 'Record Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EventBracket({ eventId, eventStatus, minParticipants = 2 }: EventBracketProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { bracket, isLoading, error } = useEventBracket(eventId);
  const { data: registrations, isLoading: loadingRegistrations } = useEventRegistrations(eventId);
  const bracketGeneration = useBracketGeneration();
  const [selectedMatch, setSelectedMatch] = useState<EventMatchWithPlayers | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [seedRandomly, setSeedRandomly] = useState(true);

  const canEdit = isAdmin && ['in_progress', 'registration_open'].includes(eventStatus);
  const canGenerate = isAdmin && ['registration_open', 'in_progress'].includes(eventStatus);
  const registrationCount = registrations?.length || 0;
  const hasEnoughParticipants = registrationCount >= Math.max(2, minParticipants);

  const handleRecordResult = (match: EventMatchWithPlayers) => {
    setSelectedMatch(match);
    setShowResultDialog(true);
  };

  const handleGenerateBracket = () => {
    if (!registrations || registrations.length < 2) return;
    
    bracketGeneration.mutate(
      {
        eventId,
        participants: registrations,
        seedRandomly,
      },
      {
        onSuccess: () => {
          setShowGenerateDialog(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading bracket...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-destructive">Failed to load bracket</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bracket || bracket.rounds.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Tournament Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Bracket not yet generated.
              </p>
              {!canGenerate && (
                <p className="text-sm text-muted-foreground mt-1">
                  The bracket will be created when registration closes.
                </p>
              )}
              
              {/* Admin generate bracket button */}
              {canGenerate && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {loadingRegistrations ? 'Loading...' : `${registrationCount} registered`}
                    </span>
                    {!hasEnoughParticipants && registrationCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                        Need {Math.max(2, minParticipants) - registrationCount} more
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowGenerateDialog(true)}
                    disabled={!hasEnoughParticipants || loadingRegistrations}
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Generate Bracket
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generate Bracket Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Tournament Bracket</DialogTitle>
              <DialogDescription>
                Create a single-elimination bracket from {registrationCount} registered participants.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <Label htmlFor="random-seed" className="font-medium">Random Seeding</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Shuffle players randomly for fair matchups
                  </p>
                </div>
                <Switch
                  id="random-seed"
                  checked={seedRandomly}
                  onCheckedChange={setSeedRandomly}
                />
              </div>
              
              {!seedRandomly && (
                <p className="text-xs text-muted-foreground">
                  Players will be seeded by registration order or bracket seed if set.
                </p>
              )}

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">
                  <strong>Participants:</strong> {registrationCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This will create {Math.pow(2, Math.ceil(Math.log2(registrationCount))) - registrationCount > 0 
                    ? `${Math.pow(2, Math.ceil(Math.log2(registrationCount))) - registrationCount} bye(s) and ` 
                    : ''
                  }
                  {Math.ceil(Math.log2(registrationCount))} round(s).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateBracket} 
                disabled={bracketGeneration.isPending}
              >
                {bracketGeneration.isPending ? 'Generating...' : 'Generate Bracket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Reverse rounds so we show from first round to finals (left to right)
  const displayRounds = [...bracket.rounds].reverse();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="flex gap-4 pb-4 min-w-max">
              {displayRounds.map((round, roundIndex) => (
                <div key={round.round_number} className="flex flex-col">
                  {/* Round header */}
                  <div className="text-center mb-4">
                    <Badge variant="outline" className="text-xs">
                      {getRoundName(round.round_number, bracket.total_rounds)}
                    </Badge>
                  </div>

                  {/* Matches in this round */}
                  <div
                    className="flex flex-col justify-around flex-1 gap-4"
                    style={{
                      // Spread matches evenly based on how many there are
                      minHeight: `${round.matches.length * 120}px`,
                    }}
                  >
                    {round.matches.map(match => (
                      <div key={match.id} className="flex items-center">
                        <MatchCard
                          match={match}
                          roundName={getRoundName(round.round_number, bracket.total_rounds)}
                          canEdit={canEdit}
                          currentUserId={user?.id}
                          onRecordResult={handleRecordResult}
                        />
                        {/* Connector arrow to next round */}
                        {roundIndex < displayRounds.length - 1 && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground/50 mx-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
              <span>Winner</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border border-dashed border-border/50 bg-muted/30" />
              <span>TBD / BYE</span>
            </div>
            {user && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-background ring-1 ring-primary/50" />
                <span>Your match</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <RecordResultDialog
        match={selectedMatch}
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
      />
    </>
  );
}
