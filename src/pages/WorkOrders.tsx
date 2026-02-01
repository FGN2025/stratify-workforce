import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { EventCard } from '@/components/marketplace/EventCard';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Filter, 
  Flame, 
  Clock, 
  Trophy, 
  Target,
  TrendingUp,
  Zap 
} from 'lucide-react';
import type { WorkOrder, GameTitle, Tenant } from '@/types/tenant';

const WorkOrders = () => {
  const { tenant } = useTenant();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [communities, setCommunities] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
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
        const typedWorkOrders: WorkOrder[] = workOrdersRes.data
          .filter(wo => wo.tenant_id === null || wo.tenant_id === tenant?.id)
          .map(wo => ({
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
        const typedTenants: Tenant[] = tenantsRes.data.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          brand_color: t.brand_color,
          logo_url: t.logo_url,
          created_at: t.created_at,
        }));
        setCommunities(typedTenants);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [tenant?.id]);

  const getRandomCommunity = () => {
    if (communities.length === 0) return undefined;
    return communities[Math.floor(Math.random() * communities.length)];
  };

  // Group work orders by game type
  const atsWorkOrders = workOrders.filter(wo => wo.game_title === 'ATS');
  const farmingWorkOrders = workOrders.filter(wo => wo.game_title === 'Farming_Sim');
  const constructionWorkOrders = workOrders.filter(wo => wo.game_title === 'Construction_Sim');
  const mechanicWorkOrders = workOrders.filter(wo => wo.game_title === 'Mechanic_Sim');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-48 w-full rounded-2xl" />
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
        <PageHero
          title="Work Orders"
          subtitle="Browse and manage training scenarios. Complete challenges, earn certifications, and track your progress across all simulation platforms."
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
            { value: `${workOrders.length}`, label: 'Active Orders', highlight: true },
            { value: `${atsWorkOrders.length}`, label: 'Trucking' },
            { value: `${farmingWorkOrders.length + constructionWorkOrders.length}`, label: 'Industrial' },
          ]}
        />

        {/* Trending Work Orders */}
        {workOrders.length > 0 && (
          <HorizontalCarousel
            title="Trending Now"
            subtitle="Most popular training scenarios this week"
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
        )}

        {/* Recently Added */}
        {workOrders.length > 0 && (
          <HorizontalCarousel
            title="Recently Added"
            subtitle="Fresh scenarios just dropped"
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
        )}

        {/* Trucking Scenarios */}
        {atsWorkOrders.length > 0 && (
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

        {/* Competitions Grid */}
        {workOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide">Active Competitions</h2>
                <p className="text-sm text-muted-foreground">Compete with other operators for top rankings</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workOrders.slice(0, 6).map((wo) => (
                <EventCard 
                  key={`competition-${wo.id}`}
                  workOrder={wo}
                  community={getRandomCommunity()}
                />
              ))}
            </div>
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
