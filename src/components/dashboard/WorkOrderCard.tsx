import { ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GameIcon, getGameLabel } from './GameIcon';
import type { WorkOrder } from '@/types/tenant';
import { cn } from '@/lib/utils';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  tenantColor?: string;
}

export function WorkOrderCard({ workOrder, tenantColor }: WorkOrderCardProps) {
  const criteria = workOrder.success_criteria as Record<string, number>;

  return (
    <div 
      className={cn(
        "glass-card p-4 hover:border-primary/50 transition-all group cursor-pointer",
        "animate-fade-in-up"
      )}
      style={tenantColor ? { borderLeftColor: tenantColor, borderLeftWidth: '3px' } : undefined}
    >
      <div className="flex items-start gap-4">
        <GameIcon game={workOrder.game_title} size="lg" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {workOrder.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getGameLabel(workOrder.game_title)}
              </p>
            </div>
            
            {workOrder.is_active && (
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-[10px]">
                ACTIVE
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {workOrder.description}
          </p>
          
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-data text-primary">{criteria.min_score || 80}%</span>
              <span>min score</span>
            </div>
            {criteria.max_damage !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-data text-amber-500">{criteria.max_damage}</span>
                <span>max damage</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Users className="h-3.5 w-3.5" />
              <span className="font-data">24</span>
              <span>active</span>
            </div>
          </div>
        </div>
        
        <Button 
          size="icon" 
          variant="ghost" 
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
