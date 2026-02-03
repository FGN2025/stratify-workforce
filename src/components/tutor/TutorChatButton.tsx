import { GraduationCap, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutor } from '@/contexts/TutorContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function TutorChatButton() {
  const { isOpen, openChat } = useTutor();
  const { user } = useAuth();

  // Don't show if chat is already open or user not logged in
  if (isOpen || !user) return null;

  return (
    <Button
      onClick={openChat}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'h-14 w-14 rounded-full shadow-lg',
        'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
        'transition-all duration-300 hover:scale-105',
        'group'
      )}
      size="icon"
    >
      <div className="relative">
        <GraduationCap className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
        <MessageCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-white/90" />
      </div>
      <span className="sr-only">Ask Atlas AI Tutor</span>
    </Button>
  );
}
