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

// Generate bracket matches for single elimination
function generateBracketMatches(
  eventId: string,
  participants: EventRegistrationWithUser[],
  seedRandomly: boolean = true
): Array<{
  event_id: string;
  round_number: number;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}> {
  const matches: Array<{
    event_id: string;
    round_number: number;
    match_order: number;
    player1_id: string | null;
    player2_id: string | null;
    status: 'pending' | 'in_progress' | 'completed';
  }> = [];

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

  // Generate first round matches
  for (let i = 0; i < firstRoundMatches; i++) {
    const player1Index = i * 2;
    const player2Index = i * 2 + 1;
    
    matches.push({
      event_id: eventId,
      round_number: totalRounds, // First round has highest round number
      match_order: i + 1,
      player1_id: playerSlots[player1Index] || null,
      player2_id: playerSlots[player2Index] || null,
      status: 'pending',
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
        status: 'pending',
      });
    }
  }

  return matches;
}

// Advance a bye winner to the next round
async function advanceByeWinner(
  eventId: string,
  match: { match_order: number; player1_id: string | null; player2_id: string | null },
  currentRoundNumber: number
) {
  const winnerId = match.player1_id || match.player2_id;
  if (!winnerId || currentRoundNumber <= 1) return;

  const nextRoundNumber = currentRoundNumber - 1;
  const nextMatchOrder = Math.ceil(match.match_order / 2);
  const isPlayer1Slot = match.match_order % 2 === 1;

  const { data: nextMatch, error: findError } = await supabase
    .from('event_matches')
    .select('*')
    .eq('event_id', eventId)
    .eq('round_number', nextRoundNumber)
    .eq('match_order', nextMatchOrder)
    .single();

  if (findError || !nextMatch) return;

  const updateData = isPlayer1Slot
    ? { player1_id: winnerId }
    : { player2_id: winnerId };

  await supabase
    .from('event_matches')
    .update(updateData)
    .eq('id', nextMatch.id);
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

      // Generate bracket matches
      const matches = generateBracketMatches(eventId, participants, seedRandomly);

      if (matches.length === 0) {
        throw new Error('Failed to generate bracket matches');
      }

      // Insert all matches
      const { data, error } = await supabase
        .from('event_matches')
        .insert(matches)
        .select();

      if (error) throw error;

      // Auto-advance byes in first round
      const firstRoundNumber = Math.max(...matches.map(m => m.round_number));
      const firstRoundMatches = data.filter(m => m.round_number === firstRoundNumber);
      
      for (const match of firstRoundMatches) {
        // If one player is null (bye), the other player advances
        if (match.player1_id && !match.player2_id) {
          await supabase
            .from('event_matches')
            .update({ 
              winner_id: match.player1_id,
              status: 'completed',
            })
            .eq('id', match.id);
          
          // Advance to next round
          await advanceByeWinner(eventId, match, firstRoundNumber);
        } else if (match.player2_id && !match.player1_id) {
          await supabase
            .from('event_matches')
            .update({ 
              winner_id: match.player2_id,
              status: 'completed',
            })
            .eq('id', match.id);
          
          // Advance to next round
          await advanceByeWinner(eventId, match, firstRoundNumber);
        }
      }

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
