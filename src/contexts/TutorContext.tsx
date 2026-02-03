import { createContext, useContext, ReactNode } from 'react';
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
}

const TutorContext = createContext<TutorContextValue | undefined>(undefined);

export function TutorProvider({ children }: { children: ReactNode }) {
  const tutorChat = useTutorChat();

  return (
    <TutorContext.Provider value={tutorChat}>
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
