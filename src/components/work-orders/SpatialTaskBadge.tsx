import { Boxes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SpatialTaskBadgeProps {
  metadata: Record<string, unknown> | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Returns true when a work order has a Breakroom (spatial) extension mapped.
 * The mapping lives on `work_orders.metadata.breakroom_course_name`.
 */
export function hasSpatialTask(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) return false;
  return typeof metadata.breakroom_course_name === 'string' && (metadata.breakroom_course_name as string).length > 0;
}

export function SpatialTaskBadge({ metadata, size = 'sm', className }: SpatialTaskBadgeProps) {
  if (!hasSpatialTask(metadata)) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 border-secondary/40 bg-secondary/10 text-secondary-foreground',
              size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
              className,
            )}
          >
            <Boxes className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            Spatial Task
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          This challenge has a Breakroom metaverse extension. Completing it in the spatial
          experience awards XP and adds a verified credential to your Skill Passport.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
