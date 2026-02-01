import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface XPRewardBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function XPRewardBadge({ xp, size = 'md', className }: XPRewardBadgeProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0 h-4 gap-0.5',
    md: 'text-[10px] px-2 py-0.5 h-5 gap-1',
    lg: 'text-xs px-2.5 py-1 h-6 gap-1',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <Badge 
      className={cn(
        'bg-primary/20 text-primary border-primary/30 font-semibold',
        sizeClasses[size],
        className
      )}
    >
      <Zap className={cn(iconSizes[size], 'fill-current')} />
      <span className="font-data">{xp}</span>
      <span className="font-normal opacity-80">XP</span>
    </Badge>
  );
}
