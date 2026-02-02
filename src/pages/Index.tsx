import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { HeroSection } from '@/components/marketplace/HeroSection';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { EventCard } from '@/components/marketplace/EventCard';
import { CommunityCard } from '@/components/marketplace/CommunityCard';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Flame, Users, Zap } from 'lucide-react';
import type { WorkOrder, GameTitle, Tenant } from '@/types/tenant';

const Index = () => {
  const { tenant } = useTenant();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [communities, setCommunities] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // Fetch work orders and tenants in parallel
      const [workOrdersRes, tenantsRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('tenants')
          .select('*')
          .order('name', { ascending: true })
      ]);

      if (workOrdersRes.data) {
        const typedWorkOrders: WorkOrder[] = workOrdersRes.data.map(wo => ({
          id: wo.id,
          tenant_id: wo.tenant_id,
          title: wo.title,
          description: wo.description,
          game_title: wo.game_title as GameTitle,
          success_criteria: (wo.success_criteria as Record<string, number>) || {},
          is_active: wo.is_active ?? true,
          created_at: wo.created_at,
        }));
        setWorkOrders(typedWorkOrders);
      }

      if (tenantsRes.data) {
        // Cast directly - Supabase returns matching shape
        setCommunities(tenantsRes.data as unknown as Tenant[]);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Get random community for each work order
  const getRandomCommunity = () => {
    if (communities.length === 0) return undefined;
    return communities[Math.floor(Math.random() * communities.length)];
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
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
      <div className="space-y-10">
        {/* Hero Section */}
        <HeroSection />

        {/* Trending Work Orders */}
        <HorizontalCarousel
          title="Trending Work Orders"
          subtitle="Discover the most popular training scenarios filling up fast!"
          viewAllLink="/work-orders"
          icon={<Flame className="h-5 w-5" />}
        >
          {workOrders.slice(0, 6).map((wo, idx) => (
            <div key={wo.id} className="w-72 shrink-0 snap-start">
              <EventCard 
                workOrder={wo}
                community={getRandomCommunity()}
                variant={idx === 0 ? 'featured' : 'default'}
              />
            </div>
          ))}
        </HorizontalCarousel>

        {/* Featured Communities */}
        <HorizontalCarousel
          title="Featured Communities"
          subtitle="Join top training organizations and level up your skills"
          viewAllLink="/communities"
          icon={<Users className="h-5 w-5" />}
        >
          {communities.map((community, idx) => (
            <div key={community.id} className="w-72 shrink-0 snap-start">
              <CommunityCard 
                community={community}
                featured={idx === 0}
              />
            </div>
          ))}
        </HorizontalCarousel>

        {/* Recently Added */}
        <HorizontalCarousel
          title="Recently Added"
          subtitle="Fresh training scenarios just added to the platform"
          viewAllLink="/work-orders?sort=newest"
          icon={<Zap className="h-5 w-5" />}
        >
          {workOrders.slice(0, 4).map((wo) => (
            <div key={`recent-${wo.id}`} className="w-80 shrink-0 snap-start">
              <EventCard 
                workOrder={wo}
                community={getRandomCommunity()}
                variant="compact"
              />
            </div>
          ))}
        </HorizontalCarousel>

        {/* Popular This Week */}
        {workOrders.length > 0 && (
          <HorizontalCarousel
            title="Popular This Week"
            subtitle="Top-rated training scenarios based on completions"
            icon={<TrendingUp className="h-5 w-5" />}
            viewAllLink="/work-orders?sort=popular"
          >
            {workOrders.slice(0, 6).map((wo) => (
              <div key={`popular-${wo.id}`} className="w-72 shrink-0 snap-start">
                <EventCard 
                  workOrder={wo}
                  community={getRandomCommunity()}
                />
              </div>
            ))}
          </HorizontalCarousel>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
