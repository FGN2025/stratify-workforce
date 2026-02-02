import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { EventMatchWithPlayers, Bracket, BracketRound, MatchStatus } from '@/types/events';

export function useEventMatches(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-matches', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from('event_matches')
        .select('*')
        .eq('event_id', eventId!)
        .order('round_number', { ascending: false })
        .order('match_order', { ascending: true });

      if (error) throw error;

      if (!matches || matches.length === 0) {
        return [] as EventMatchWithPlayers[];
      }

      // Get all unique player IDs
      const playerIds = new Set<string>();
      matches.forEach(m => {
        if (m.player1_id) playerIds.add(m.player1_id);
        if (m.player2_id) playerIds.add(m.player2_id);
        if (m.winner_id) playerIds.add(m.winner_id);
      });

      // Fetch player profiles
      const { data: profiles } = await supabase
        .rpc('get_public_profile_data', { profile_ids: Array.from(playerIds) });

      const profileMap: Record<string, { id: string; username: string | null; avatar_url: string | null }> = {};
      (profiles || []).forEach(p => {
        profileMap[p.id] = {
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
        };
      });

      return matches.map(match => ({
        id: match.id,
        event_id: match.event_id,
        round_number: match.round_number,
        match_order: match.match_order,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        winner_id: match.winner_id,
        player1_score: match.player1_score,
        player2_score: match.player2_score,
        scheduled_time: match.scheduled_time,
        status: match.status as MatchStatus,
        created_at: match.created_at,
        updated_at: match.updated_at,
        player1: match.player1_id ? profileMap[match.player1_id] : null,
        player2: match.player2_id ? profileMap[match.player2_id] : null,
        winner: match.winner_id ? profileMap[match.winner_id] : null,
      })) as EventMatchWithPlayers[];
    },
  });
}

export function useEventBracket(eventId: string | undefined) {
  const { data: matches, isLoading, error } = useEventMatches(eventId);

  if (!matches || matches.length === 0) {
    return { bracket: null, isLoading, error };
  }

  // Group matches by round
  const roundsMap = new Map<number, EventMatchWithPlayers[]>();
  matches.forEach(match => {
    if (!roundsMap.has(match.round_number)) {
      roundsMap.set(match.round_number, []);
    }
    roundsMap.get(match.round_number)!.push(match);
  });

  // Sort rounds (highest first = finals first in display)
  const rounds: BracketRound[] = Array.from(roundsMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([round_number, roundMatches]) => ({
      round_number,
      matches: roundMatches.sort((a, b) => a.match_order - b.match_order),
    }));

  const bracket: Bracket = {
    event_id: eventId!,
    rounds,
    total_rounds: rounds.length,
  };

  return { bracket, isLoading, error };
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      winnerId,
      player1Score,
      player2Score,
    }: {
      matchId: string;
      winnerId: string;
      player1Score?: number;
      player2Score?: number;
    }) => {
      // Update the current match
      const { data: updatedMatch, error } = await supabase
        .from('event_matches')
        .update({
          winner_id: winnerId,
          player1_score: player1Score,
          player2_score: player2Score,
          status: 'completed',
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      // Advance winner to next round
      await advanceWinnerToNextRound(updatedMatch);

      return updatedMatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-matches', data.event_id] });
      toast({
        title: 'Match updated',
        description: 'Match result has been recorded and winner advanced.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Advance the winner of a completed match to the next round
async function advanceWinnerToNextRound(completedMatch: {
  id: string;
  event_id: string;
  round_number: number;
  match_order: number;
  winner_id: string | null;
}) {
  if (!completedMatch.winner_id) return;

  // Round 1 is the finals - no next round
  if (completedMatch.round_number <= 1) return;

  const nextRoundNumber = completedMatch.round_number - 1;
  // Two matches feed into one: match 1&2 -> match 1, match 3&4 -> match 2, etc.
  const nextMatchOrder = Math.ceil(completedMatch.match_order / 2);
  // Odd match_order goes to player1, even goes to player2
  const isPlayer1Slot = completedMatch.match_order % 2 === 1;

  // Find the next round match
  const { data: nextMatch, error: findError } = await supabase
    .from('event_matches')
    .select('*')
    .eq('event_id', completedMatch.event_id)
    .eq('round_number', nextRoundNumber)
    .eq('match_order', nextMatchOrder)
    .single();

  if (findError || !nextMatch) {
    console.error('Could not find next round match:', findError);
    return;
  }

  // Update the appropriate player slot
  const updateData = isPlayer1Slot
    ? { player1_id: completedMatch.winner_id }
    : { player2_id: completedMatch.winner_id };

  const { error: updateError } = await supabase
    .from('event_matches')
    .update(updateData)
    .eq('id', nextMatch.id);

  if (updateError) {
    console.error('Failed to advance winner:', updateError);
  }
}
