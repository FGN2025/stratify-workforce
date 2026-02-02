import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { EventCard } from '@/components/marketplace/EventCard';
import { WorkOrderFilters, WorkOrderFilter } from '@/components/work-orders/WorkOrderFilters';
import { useWorkOrders, WorkOrderWithXP } from '@/hooks/useWorkOrders';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Filter, 
  Flame, 
  Clock, 
  Trophy, 
  Target,
  Zap 
} from 'lucide-react';
import type { Tenant, GameTitle } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const WorkOrders = () => {
  const [activeFilter, setActiveFilter] = useState<WorkOrderFilter>('all');
  const { subscribedGames } = useChannelSubscriptions();
  
  // Fetch all work orders
  const { data: allWorkOrders = [], isLoading: loadingWorkOrders } = useWorkOrders('all');
  
  // Fetch communities for display
  const { data: communities = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*').order('name', { ascending: true });
      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        brand_color: t.brand_color,
        logo_url: t.logo_url,
        created_at: t.created_at,
      })) as Tenant[];
    },
  });

  // Filter work orders based on active filter
  const filteredWorkOrders = useMemo(() => {
    if (activeFilter === 'all') return allWorkOrders;
    if (activeFilter === 'for-you') {
      return allWorkOrders.filter(wo => subscribedGames.includes(wo.game_title));
    }
    return allWorkOrders.filter(wo => wo.game_title === activeFilter);
  }, [allWorkOrders, activeFilter, subscribedGames]);

  // Calculate counts for filter badges
  const workOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allWorkOrders.length,
      'for-you': allWorkOrders.filter(wo => subscribedGames.includes(wo.game_title)).length,
    };
    
    const gameTitles: GameTitle[] = ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'];
    gameTitles.forEach(game => {
      counts[game] = allWorkOrders.filter(wo => wo.game_title === game).length;
    });
    
    return counts;
  }, [allWorkOrders, subscribedGames]);

  const getRandomCommunity = () => {
    if (communities.length === 0) return undefined;
    return communities[Math.floor(Math.random() * communities.length)];
  };

  // Group work orders by game type
  const atsWorkOrders = filteredWorkOrders.filter(wo => wo.game_title === 'ATS');
  const farmingWorkOrders = filteredWorkOrders.filter(wo => wo.game_title === 'Farming_Sim');

  if (loadingWorkOrders) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-72 w-72 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <PageHero
          title="Work Orders"
          subtitle="Browse and manage training scenarios. Complete challenges, earn XP, and track your progress across all simulation platforms."
          backgroundImage="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=600&fit=crop"
          primaryAction={{
            label: 'New Work Order',
            icon: <Plus className="h-4 w-4" />,
          }}
          secondaryAction={{
            label: 'Filter',
            icon: <Filter className="h-4 w-4" />,
          }}
          stats={[
            { value: `${allWorkOrders.length}`, label: 'Active Orders', highlight: true },
            { value: `${atsWorkOrders.length}`, label: 'Trucking' },
            { value: `${farmingWorkOrders.length}`, label: 'Farming' },
          ]}
        />

        {/* Filters */}
        <WorkOrderFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          workOrderCounts={workOrderCounts}
        />

        {/* Trending Work Orders */}
        {filteredWorkOrders.length > 0 && (
          <HorizontalCarousel
            title="Trending Now"
            subtitle="Most popular training scenarios this week"
            icon={<Flame className="h-5 w-5" />}
          >
            {filteredWorkOrders.slice(0, 6).map((wo, idx) => (
              <div key={wo.id} className="w-72 shrink-0 snap-start">
                <EventCard 
                  workOrder={wo}
                  community={getRandomCommunity()}
                  variant={idx === 0 ? 'featured' : 'default'}
                />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Recently Added */}
        {filteredWorkOrders.length > 0 && (
          <HorizontalCarousel
            title="Recently Added"
            subtitle="Fresh scenarios just dropped"
            icon={<Zap className="h-5 w-5" />}
          >
            {filteredWorkOrders.slice(0, 4).map((wo) => (
              <div key={`recent-${wo.id}`} className="w-80 shrink-0 snap-start">
                <EventCard 
                  workOrder={wo}
                  community={getRandomCommunity()}
                  variant="compact"
                />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Trucking Scenarios */}
        {atsWorkOrders.length > 0 && activeFilter !== 'ATS' && (
          <HorizontalCarousel
            title="Trucking & Logistics"
            subtitle="American Truck Simulator scenarios"
            icon={<Target className="h-5 w-5" />}
          >
            {atsWorkOrders.map((wo) => (
              <div key={`ats-${wo.id}`} className="w-72 shrink-0 snap-start">
                <EventCard 
                  workOrder={wo}
                  community={getRandomCommunity()}
                />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Competitions Carousel */}
        {filteredWorkOrders.length > 0 && (
          <HorizontalCarousel
            title="Active Competitions"
            subtitle="Compete with other operators for top rankings"
            icon={<Trophy className="h-5 w-5" />}
            viewAllLink="/work-orders?filter=competitions"
          >
            {filteredWorkOrders.slice(0, 6).map((wo) => (
              <div key={`competition-${wo.id}`} className="w-72 shrink-0 snap-start">
                <EventCard 
                  workOrder={wo}
                  community={getRandomCommunity()}
                />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Empty State */}
        {filteredWorkOrders.length === 0 && (
          <section className="glass-card p-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Work Orders Found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {activeFilter === 'for-you' 
                ? "Subscribe to game channels to see personalized work orders."
                : "No work orders match your current filter."}
            </p>
            <Button variant="outline" onClick={() => setActiveFilter('all')}>
              View All Work Orders
            </Button>
          </section>
        )}

        {/* Coming Soon Teaser */}
        <section className="glass-card p-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">More Scenarios Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            New training scenarios are added weekly. Check back often or enable notifications to stay updated.
          </p>
          <Button variant="outline">Enable Notifications</Button>
        </section>
      </div>
    </AppLayout>
  );
};

export default WorkOrders;
