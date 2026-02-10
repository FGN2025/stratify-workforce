import { createContext, useContext, ReactNode, useState } from 'react';
import { useTutorChat } from '@/hooks/useTutorChat';
import type { TutorMessage } from '@/types/tutor';

interface TutorContextValue {
  isOpen: boolean;
  messages: TutorMessage[];
  isStreaming: boolean;
  error: string | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  cancelStream: () => void;
  clearConversation: () => Promise<void>;
  chatMode: 'tutor' | 'research';
  setChatMode: (mode: 'tutor' | 'research') => void;
}

const TutorContext = createContext<TutorContextValue | undefined>(undefined);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [chatMode, setChatMode] = useState<'tutor' | 'research'>('tutor');
  const tutorChat = useTutorChat(chatMode);

  return (
    <TutorContext.Provider value={{ ...tutorChat, chatMode, setChatMode }}>
      {children}
    </TutorContext.Provider>
  );
}

export function useTutor() {
  const context = useContext(TutorContext);
  if (context === undefined) {
    throw new Error('useTutor must be used within a TutorProvider');
  }
  return context;
}
