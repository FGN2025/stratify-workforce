import { useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTutorContext } from './useTutorContext';
import type { TutorMessage, TutorChatState, TutorChatAction, TutorConversation } from '@/types/tutor';
import { useToast } from '@/hooks/use-toast';

const TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const initialState: TutorChatState = {
  isOpen: false,
  conversationId: null,
  messages: [],
  isStreaming: false,
  error: null,
};

function tutorReducer(state: TutorChatState, action: TutorChatAction): TutorChatState {
  switch (action.type) {
    case 'OPEN_CHAT':
      return { ...state, isOpen: true };
    case 'CLOSE_CHAT':
      return { ...state, isOpen: false };
    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_LAST_MESSAGE':
      if (state.messages.length === 0) return state;
      const updatedMessages = [...state.messages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      if (lastMessage.role === 'assistant') {
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: action.payload,
        };
      }
      return { ...state, messages: updatedMessages };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useTutorChat() {
  const [state, dispatch] = useReducer(tutorReducer, initialState);
  const { user, session } = useAuth();
  const { apiContext, pageContext } = useTutorContext();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load or create conversation when chat opens
  useEffect(() => {
    if (state.isOpen && user && !state.conversationId) {
      loadOrCreateConversation();
    }
  }, [state.isOpen, user]);

  const loadOrCreateConversation = async () => {
    if (!user) return;

    try {
      // Try to find an active conversation for this context
      const { data: existingConversation } = await supabase
        .from('tutor_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('context_type', pageContext.type)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (existingConversation) {
        dispatch({ type: 'SET_CONVERSATION_ID', payload: existingConversation.id });
        
        // Load messages for this conversation
        const { data: messages } = await supabase
          .from('tutor_messages')
          .select('*')
          .eq('conversation_id', existingConversation.id)
          .order('created_at', { ascending: true });

        if (messages) {
          dispatch({ type: 'SET_MESSAGES', payload: messages as TutorMessage[] });
        }
      } else {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('tutor_conversations')
          .insert({
            user_id: user.id,
            context_type: pageContext.type,
            context_id: pageContext.id || null,
            game_title: pageContext.gameTitle || null,
            title: `Chat - ${pageContext.title || 'General'}`,
          })
          .select()
          .single();

        if (error) throw error;
        if (newConversation) {
          dispatch({ type: 'SET_CONVERSATION_ID', payload: newConversation.id });
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const openChat = useCallback(() => {
    dispatch({ type: 'OPEN_CHAT' });
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: 'CLOSE_CHAT' });
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !session || state.isStreaming) return;

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      conversation_id: state.conversationId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_STREAMING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    // Create placeholder for assistant message
    const assistantMessage: TutorMessage = {
      id: crypto.randomUUID(),
      conversation_id: state.conversationId || '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

    // Prepare messages for API (only user and assistant, not system)
    const apiMessages = [...state.messages, userMessage]
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(TUTOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          context: apiContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullContent += deltaContent;
              dispatch({ type: 'UPDATE_LAST_MESSAGE', payload: fullContent });
            }
          } catch {
            // Partial JSON, put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save messages to database
      if (state.conversationId) {
        await supabase.from('tutor_messages').insert([
          {
            conversation_id: state.conversationId,
            role: 'user',
            content,
          },
          {
            conversation_id: state.conversationId,
            role: 'assistant',
            content: fullContent,
          },
        ]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // User cancelled
      }

      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      toast({
        title: 'Chat Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Remove the empty assistant message on error
      dispatch({
        type: 'SET_MESSAGES',
        payload: state.messages.filter(m => m.id !== assistantMessage.id),
      });
    } finally {
      dispatch({ type: 'SET_STREAMING', payload: false });
      abortControllerRef.current = null;
    }
  }, [user, session, state.conversationId, state.messages, state.isStreaming, apiContext, toast]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearConversation = useCallback(async () => {
    if (!state.conversationId) return;

    try {
      // Mark current conversation as inactive
      await supabase
        .from('tutor_conversations')
        .update({ is_active: false })
        .eq('id', state.conversationId);

      // Reset state
      dispatch({ type: 'SET_CONVERSATION_ID', payload: null as any });
      dispatch({ type: 'SET_MESSAGES', payload: [] });

      // Create new conversation
      await loadOrCreateConversation();
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }, [state.conversationId]);

  return {
    isOpen: state.isOpen,
    messages: state.messages,
    isStreaming: state.isStreaming,
    error: state.error,
    openChat,
    closeChat,
    sendMessage,
    cancelStream,
    clearConversation,
  };
}
