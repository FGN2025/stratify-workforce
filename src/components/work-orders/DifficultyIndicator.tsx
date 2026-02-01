import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];

interface DifficultyIndicatorProps {
  difficulty: WorkOrderDifficulty;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const difficultyConfig: Record<WorkOrderDifficulty, { stars: number; label: string; color: string }> = {
  beginner: { stars: 1, label: 'Beginner', color: 'text-green-500' },
  intermediate: { stars: 2, label: 'Intermediate', color: 'text-amber-500' },
  advanced: { stars: 3, label: 'Advanced', color: 'text-red-500' },
};

export function DifficultyIndicator({ 
  difficulty, 
  showLabel = false, 
  size = 'md',
  className 
}: DifficultyIndicatorProps) {
  const config = difficultyConfig[difficulty];
  
  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const textSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            className={cn(
              iconSizes[size],
              star <= config.stars ? cn(config.color, 'fill-current') : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn(textSizes[size], 'text-muted-foreground')}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export function getDifficultyLabel(difficulty: WorkOrderDifficulty): string {
  return difficultyConfig[difficulty].label;
}
