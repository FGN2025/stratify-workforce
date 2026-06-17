import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { HeroSection } from '@/components/marketplace/HeroSection';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { EventCard } from '@/components/marketplace/EventCard';
import { CommunityCard } from '@/components/marketplace/CommunityCard';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Flame, Users, Zap } from 'lucide-react';
import type { WorkOrder, Tenant } from '@/types/tenant';

const Index = () => {
  const { tenant } = useTenant();
  const { data: curatedWorkOrders, isLoading: workOrdersLoading } = useWorkOrders('all');
  const [communities, setCommunities] = useState<Tenant[]>([]);
  const [communityMap, setCommunityMap] = useState<Record<string, Tenant>>({});
  const [communitiesLoading, setCommunitiesLoading] = useState(true);

  // Featured Communities intentionally stays global — every tenant can discover
  // the others at a basic card level (no cross-tenant content sharing).
  useEffect(() => {
    async function fetchCommunities() {
      setCommunitiesLoading(true);
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('approval_status', 'approved')
        .order('name', { ascending: true });

      if (data) {
        const typed = data as unknown as Tenant[];
        setCommunities(typed);
        const map: Record<string, Tenant> = {};
        typed.forEach(t => { map[t.id] = t; });
        setCommunityMap(map);
      }
      setCommunitiesLoading(false);
    }
    fetchCommunities();
  }, []);

  // Map curated work orders (filtered server-side by RLS / curation) to the
  // shape the marketplace cards expect.
  const workOrders: WorkOrder[] = useMemo(() => {
    return (curatedWorkOrders ?? []).map(wo => ({
      id: wo.id,
      tenant_id: wo.tenant_id,
      title: wo.title,
      generated_name: wo.generated_name,
      description: wo.description,
      game_title: wo.game_title,
      success_criteria: wo.success_criteria,
      is_active: wo.is_active,
      created_at: wo.created_at,
      cover_image_url: wo.cover_image_url,
      metadata: wo.metadata,
    }));
  }, [curatedWorkOrders]);

  const isLoading = workOrdersLoading || communitiesLoading;

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
        <HeroSection />

        {/* Trending Work Orders (curated per tenant) */}
        <HorizontalCarousel
          title="Trending Work Orders"
          subtitle={
            workOrders.length === 0
              ? `No work orders in ${tenant?.name ?? 'this community'} yet — admins can curate the catalog in Admin → Curation.`
              : 'Discover the most popular training scenarios filling up fast!'
          }
          viewAllLink="/work-orders"
          icon={<Flame className="h-5 w-5" />}
        >
          {workOrders.slice(0, 6).map((wo, idx) => (
            <div key={wo.id} className="w-72 shrink-0 snap-start">
              <EventCard 
                workOrder={wo}
                community={wo.tenant_id ? communityMap[wo.tenant_id] : undefined}
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
                community={wo.tenant_id ? communityMap[wo.tenant_id] : undefined}
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
                  community={wo.tenant_id ? communityMap[wo.tenant_id] : undefined}
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
