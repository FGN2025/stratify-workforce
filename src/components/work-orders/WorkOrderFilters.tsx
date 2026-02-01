import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { GameIcon, getGameLabel } from '@/components/dashboard/GameIcon';
import { Sparkles, Globe, Truck, Tractor, HardHat, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

export type WorkOrderFilter = 'for-you' | 'all' | GameTitle;

interface WorkOrderFiltersProps {
  activeFilter: WorkOrderFilter;
  onFilterChange: (filter: WorkOrderFilter) => void;
  workOrderCounts?: Record<string, number>;
  className?: string;
}

const gameFilters: { value: GameTitle; icon: React.ReactNode }[] = [
  { value: 'ATS', icon: <Truck className="h-4 w-4" /> },
  { value: 'Farming_Sim', icon: <Tractor className="h-4 w-4" /> },
  { value: 'Construction_Sim', icon: <HardHat className="h-4 w-4" /> },
  { value: 'Mechanic_Sim', icon: <Wrench className="h-4 w-4" /> },
];

export function WorkOrderFilters({
  activeFilter,
  onFilterChange,
  workOrderCounts = {},
  className,
}: WorkOrderFiltersProps) {
  const { subscribedGames, isLoading } = useChannelSubscriptions();
  const hasSubscriptions = subscribedGames.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as WorkOrderFilter)}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          {/* For You - only show if user has subscriptions */}
          {hasSubscriptions && (
            <TabsTrigger
              value="for-you"
              className={cn(
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                'gap-1.5 px-3 py-1.5 rounded-full border border-border/50',
                'hover:bg-muted/50 transition-colors'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              For You
              {workOrderCounts['for-you'] !== undefined && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {workOrderCounts['for-you']}
                </Badge>
              )}
            </TabsTrigger>
          )}

          {/* All */}
          <TabsTrigger
            value="all"
            className={cn(
              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
              'gap-1.5 px-3 py-1.5 rounded-full border border-border/50',
              'hover:bg-muted/50 transition-colors'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            All
            {workOrderCounts['all'] !== undefined && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {workOrderCounts['all']}
              </Badge>
            )}
          </TabsTrigger>

          {/* Game-specific filters */}
          {gameFilters.map(({ value, icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                'gap-1.5 px-3 py-1.5 rounded-full border border-border/50',
                'hover:bg-muted/50 transition-colors',
                subscribedGames.includes(value) && 'ring-1 ring-primary/30'
              )}
            >
              {icon}
              <span className="hidden sm:inline">{getGameLabel(value)}</span>
              {workOrderCounts[value] !== undefined && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {workOrderCounts[value]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Subscription prompt for users with no subscriptions */}
      {!isLoading && !hasSubscriptions && (
        <div className="glass-card p-4 flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Personalize your feed</p>
            <p className="text-xs text-muted-foreground">
              Subscribe to game channels to see work orders tailored to your interests.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {gameFilters.map(({ value }) => (
              <Badge 
                key={value} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
              >
                {getGameLabel(value)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
