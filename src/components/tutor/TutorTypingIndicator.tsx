import { cn } from '@/lib/utils';

interface TutorTypingIndicatorProps {
  className?: string;
}

export function TutorTypingIndicator({ className }: TutorTypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex gap-1">
        <span
          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-xs text-muted-foreground ml-2">Atlas is thinking...</span>
    </div>
  );
}
