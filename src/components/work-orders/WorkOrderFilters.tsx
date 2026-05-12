import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { useSimCategories } from '@/hooks/useSimCategories';
import { getIconByKey } from '@/lib/sim-icons';
import { Sparkles, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkOrderFilter = 'for-you' | 'all' | string;

interface WorkOrderFiltersProps {
  activeFilter: WorkOrderFilter;
  onFilterChange: (filter: WorkOrderFilter) => void;
  workOrderCounts?: Record<string, number>;
  className?: string;
}

export function WorkOrderFilters({
  activeFilter,
  onFilterChange,
  workOrderCounts = {},
  className,
}: WorkOrderFiltersProps) {
  const { subscribedGames } = useChannelSubscriptions();
  const { data: categories = [] } = useSimCategories();
  const hasSubscriptions = subscribedGames.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as WorkOrderFilter)}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          {hasSubscriptions && (
            <TabsTrigger
              value="for-you"
              className={cn(
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                'gap-1.5 px-3 py-1.5 rounded-full border border-border/50 hover:bg-muted/50 transition-colors'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              For You
              {workOrderCounts['for-you'] !== undefined && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{workOrderCounts['for-you']}</Badge>
              )}
            </TabsTrigger>
          )}

          <TabsTrigger
            value="all"
            className={cn(
              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
              'gap-1.5 px-3 py-1.5 rounded-full border border-border/50 hover:bg-muted/50 transition-colors'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            All
            {workOrderCounts['all'] !== undefined && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{workOrderCounts['all']}</Badge>
            )}
          </TabsTrigger>

          {categories.map((cat) => {
            const Icon = getIconByKey(cat.icon_key);
            const subscribedHere = cat.default_game_titles.some((g) => subscribedGames.includes(g));
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className={cn(
                  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                  'gap-1.5 px-3 py-1.5 rounded-full border border-border/50 hover:bg-muted/50 transition-colors',
                  subscribedHere && 'ring-1 ring-primary/30'
                )}
              >
                <Icon className="h-4 w-4" style={{ color: cat.accent_color }} />
                <span className="hidden sm:inline">{cat.title}</span>
                {workOrderCounts[cat.key] !== undefined && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{workOrderCounts[cat.key]}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
