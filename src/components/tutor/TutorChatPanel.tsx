import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, GraduationCap, BookOpen, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTutor } from '@/contexts/TutorContext';
import { useTutorContext } from '@/hooks/useTutorContext';
import { TutorMessage } from './TutorMessage';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAIPlatformSettings } from '@/hooks/useAIConfig';
import { cn } from '@/lib/utils';



export function TutorChatPanel() {
  const { isOpen, closeChat, messages, isStreaming, sendMessage, clearConversation, chatMode, setChatMode } = useTutor();
  const { pageContext } = useTutorContext();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { data: platformSettings } = useAIPlatformSettings();

  const researchEnabled = platformSettings?.find(s => s.key === 'research_mode_enabled')?.value === true;
  const notebookUrl = platformSettings?.find(s => s.key === 'open_notebook_url')?.value;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const contextLabel = chatMode === 'research'
    ? 'Research Mode'
    : pageContext.gameTitle
      ? `${pageContext.gameTitle} • ${pageContext.title}`
      : pageContext.title || 'General';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col p-0',
          isMobile ? 'h-[85vh] rounded-t-xl' : 'w-[400px] sm:max-w-[400px]'
        )}
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                {chatMode === 'research' ? (
                  <FlaskConical className="h-5 w-5 text-white" />
                ) : (
                  <GraduationCap className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <SheetTitle className="text-left text-base font-semibold">
                  Atlas AI {chatMode === 'research' ? 'Research' : 'Tutor'}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">{contextLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {notebookUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                  onClick={() => window.open(typeof notebookUrl === 'string' ? notebookUrl : '', '_blank')}
                  title="Open Notebook"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={clearConversation}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeChat}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mode Toggle */}
          {researchEnabled && (
            <div className="flex gap-1 mt-2 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setChatMode('tutor')}
                className={cn(
                  'flex-1 text-xs py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5',
                  chatMode === 'tutor'
                    ? 'bg-background shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Tutor
              </button>
              <button
                onClick={() => setChatMode('research')}
                className={cn(
                  'flex-1 text-xs py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5',
                  chatMode === 'research'
                    ? 'bg-background shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Research
              </button>
            </div>
          )}
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                  {chatMode === 'research' ? (
                    <FlaskConical className="h-8 w-8 text-emerald-600" />
                  ) : (
                    <GraduationCap className="h-8 w-8 text-emerald-600" />
                  )}
                </div>
                <h3 className="font-medium text-lg mb-2">
                  {chatMode === 'research' ? 'Research Mode' : "Hi! I'm Atlas"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  {chatMode === 'research'
                    ? 'Ask deeper questions and explore topics with comprehensive, detailed answers.'
                    : 'Your AI tutor for FGN Academy. Ask me anything about your courses, work orders, or career path!'
                  }
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {(chatMode === 'research'
                    ? [
                        'Compare CDL endorsement types',
                        'Fiber optic cable standards',
                        'DOT inspection requirements',
                      ]
                    : [
                        'How do I improve my XP?',
                        'What work order should I try next?',
                        'Explain fusion splicing',
                      ]
                  ).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <TutorMessage
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming && index === messages.length - 1}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex-shrink-0 border-t p-4 bg-background"
        >
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={chatMode === 'research' ? 'Research a topic...' : 'Ask Atlas anything...'}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isStreaming}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
