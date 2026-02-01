import type { Database } from '@/integrations/supabase/types';

// Enum types from database
export type EventType = 'quest' | 'head_to_head';
export type EventStatus = 'draft' | 'published' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type RegistrationStatus = 'registered' | 'confirmed' | 'cancelled' | 'no_show';
export type MatchStatus = 'pending' | 'in_progress' | 'completed';

// Game title from existing types
export type GameTitle = Database['public']['Enums']['game_title'];

// Core event type
export interface Event {
  id: string;
  work_order_id: string | null;
  title: string;
  description: string | null;
  event_type: EventType;
  scheduled_start: string;
  scheduled_end: string;
  registration_deadline: string | null;
  min_participants: number;
  max_participants: number | null;
  status: EventStatus;
  tenant_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  google_calendar_event_id: string | null;
}

// Event with work order details for display
export interface EventWithDetails extends Event {
  work_order?: {
    id: string;
    title: string;
    game_title: GameTitle;
    xp_reward: number;
    difficulty: Database['public']['Enums']['work_order_difficulty'];
  } | null;
  registration_count?: number;
}

// Event registration
export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  status: RegistrationStatus;
  bracket_seed: number | null;
}

// Registration with user profile for display
export interface EventRegistrationWithUser extends EventRegistration {
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

// Head-to-head match
export interface EventMatch {
  id: string;
  event_id: string;
  round_number: number;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  scheduled_time: string | null;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

// Match with player profiles for display
export interface EventMatchWithPlayers extends EventMatch {
  player1?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  player2?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  winner?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

// Filter options for events list
export interface EventFilters {
  status?: EventStatus | 'all';
  event_type?: EventType | 'all';
  game_title?: GameTitle | 'all';
  date_from?: Date;
  date_to?: Date;
}

// Form data for creating/editing events
export interface EventFormData {
  title: string;
  description: string;
  work_order_id: string | null;
  event_type: EventType;
  scheduled_start: Date;
  scheduled_end: Date;
  registration_deadline: Date | null;
  min_participants: number;
  max_participants: number | null;
  status: EventStatus;
  tenant_id: string | null;
}

// Bracket structure for visualization
export interface BracketRound {
  round_number: number;
  matches: EventMatchWithPlayers[];
}

export interface Bracket {
  event_id: string;
  rounds: BracketRound[];
  total_rounds: number;
}
