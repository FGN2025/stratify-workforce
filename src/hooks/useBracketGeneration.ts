import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { EventRegistrationWithUser } from '@/types/events';

// Calculate number of rounds needed for single elimination
function calculateRounds(participantCount: number): number {
  return Math.ceil(Math.log2(participantCount));
}

// Calculate number of byes needed
function calculateByes(participantCount: number): number {
  const nextPowerOfTwo = Math.pow(2, calculateRounds(participantCount));
  return nextPowerOfTwo - participantCount;
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Match data for insertion
interface MatchInsertData {
  event_id: string;
  round_number: number;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

// Generate bracket matches for single elimination
function generateBracketMatches(
  eventId: string,
  participants: EventRegistrationWithUser[],
  seedRandomly: boolean = true
): MatchInsertData[] {
  const matches: MatchInsertData[] = [];

  const participantCount = participants.length;
  if (participantCount < 2) {
    return matches;
  }

  const totalRounds = calculateRounds(participantCount);
  const byeCount = calculateByes(participantCount);
  const firstRoundMatches = Math.pow(2, totalRounds - 1);

  // Seed participants
  let seeded: EventRegistrationWithUser[];
  if (seedRandomly) {
    seeded = shuffleArray(participants);
  } else {
    // Use bracket_seed if available, otherwise order by registration time
    seeded = [...participants].sort((a, b) => {
      if (a.bracket_seed !== null && b.bracket_seed !== null) {
        return a.bracket_seed - b.bracket_seed;
      }
      return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime();
    });
  }

  // Create player slots with byes at the end
  const playerSlots: (string | null)[] = seeded.map(p => p.user_id);
  for (let i = 0; i < byeCount; i++) {
    playerSlots.push(null); // null = bye
  }

  // Generate first round matches - mark bye matches as already completed
  for (let i = 0; i < firstRoundMatches; i++) {
    const player1Index = i * 2;
    const player2Index = i * 2 + 1;
    const player1 = playerSlots[player1Index] || null;
    const player2 = playerSlots[player2Index] || null;
    
    // Determine if this is a bye match (one player is null)
    const isByeMatch = (player1 && !player2) || (!player1 && player2);
    const byeWinner = isByeMatch ? (player1 || player2) : null;
    
    matches.push({
      event_id: eventId,
      round_number: totalRounds, // First round has highest round number
      match_order: i + 1,
      player1_id: player1,
      player2_id: player2,
      winner_id: byeWinner,
      status: isByeMatch ? 'completed' : 'pending',
    });
  }

  // Generate subsequent rounds (empty matches waiting for winners)
  for (let round = totalRounds - 1; round >= 1; round--) {
    const matchesInRound = Math.pow(2, round - 1);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        event_id: eventId,
        round_number: round,
        match_order: i + 1,
        player1_id: null, // Will be filled when previous round completes
        player2_id: null,
        winner_id: null,
        status: 'pending',
      });
    }
  }

  return matches;
}

// Advance bye winners to their next round matches
async function advanceByeWinners(
  eventId: string,
  insertedMatches: Array<{
    id: string;
    round_number: number;
    match_order: number;
    winner_id: string | null;
    status: string;
  }>
) {
  // Find completed bye matches (first round matches with a winner already set)
  const firstRoundNumber = Math.max(...insertedMatches.map(m => m.round_number));
  const byeMatches = insertedMatches.filter(
    m => m.round_number === firstRoundNumber && m.status === 'completed' && m.winner_id
  );

  if (byeMatches.length === 0 || firstRoundNumber <= 1) return;

  // Build a map of next round matches by their match_order for quick lookup
  const nextRoundNumber = firstRoundNumber - 1;
  const nextRoundMatches = insertedMatches.filter(m => m.round_number === nextRoundNumber);
  const nextRoundMap = new Map(nextRoundMatches.map(m => [m.match_order, m]));

  // Prepare all updates
  const updates: Array<{ matchId: string; updateData: { player1_id?: string; player2_id?: string } }> = [];

  for (const byeMatch of byeMatches) {
    const nextMatchOrder = Math.ceil(byeMatch.match_order / 2);
    const isPlayer1Slot = byeMatch.match_order % 2 === 1;
    const nextMatch = nextRoundMap.get(nextMatchOrder);

    if (nextMatch && byeMatch.winner_id) {
      updates.push({
        matchId: nextMatch.id,
        updateData: isPlayer1Slot
          ? { player1_id: byeMatch.winner_id }
          : { player2_id: byeMatch.winner_id },
      });
    }
  }

  // Execute all updates in parallel
  await Promise.all(
    updates.map(({ matchId, updateData }) =>
      supabase.from('event_matches').update(updateData).eq('id', matchId)
    )
  );
}

export function useBracketGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      participants,
      seedRandomly = true,
    }: {
      eventId: string;
      participants: EventRegistrationWithUser[];
      seedRandomly?: boolean;
    }) => {
      if (participants.length < 2) {
        throw new Error('Need at least 2 participants to generate a bracket');
      }

      // Delete any existing matches for this event
      await supabase
        .from('event_matches')
        .delete()
        .eq('event_id', eventId);

      // Generate bracket matches (bye matches are already marked completed with winners)
      const matches = generateBracketMatches(eventId, participants, seedRandomly);

      if (matches.length === 0) {
        throw new Error('Failed to generate bracket matches');
      }

      // Insert all matches atomically
      const { data, error } = await supabase
        .from('event_matches')
        .insert(matches)
        .select();

      if (error) throw error;

      // Advance bye winners to next round in parallel
      await advanceByeWinners(eventId, data);

      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['event-matches', data[0].event_id] });
      }
      toast({
        title: 'Bracket generated',
        description: 'The tournament bracket has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bracket generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
