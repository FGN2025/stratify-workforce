export type TutorContextType = 
  | 'general' 
  | 'course' 
  | 'work_order' 
  | 'lesson' 
  | 'game' 
  | 'onboarding';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface TutorMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: {
    tokens_used?: number;
    model?: string;
    latency_ms?: number;
  };
  created_at: string;
}

export interface TutorConversation {
  id: string;
  user_id: string;
  title: string | null;
  context_type: TutorContextType;
  context_id: string | null;
  game_title: string | null;
  is_active: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface TutorPageContext {
  type: TutorContextType;
  id?: string;
  gameTitle?: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface TutorUserContext {
  xp: number;
  level: number;
  levelName: string;
  enrolledCourses: string[];
  activeGames: string[];
}

export interface TutorChatState {
  isOpen: boolean;
  conversationId: string | null;
  messages: TutorMessage[];
  isStreaming: boolean;
  error: string | null;
}

export type TutorChatAction =
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SET_CONVERSATION_ID'; payload: string }
  | { type: 'SET_MESSAGES'; payload: TutorMessage[] }
  | { type: 'ADD_MESSAGE'; payload: TutorMessage }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: string }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };
