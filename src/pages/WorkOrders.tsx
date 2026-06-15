import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { EventCard } from '@/components/marketplace/EventCard';
import { ExternalResourceCard } from '@/components/marketplace/ExternalResourceCard';
import { WorkOrderFilters, WorkOrderFilter } from '@/components/work-orders/WorkOrderFilters';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkOrderCompletions } from '@/hooks/useWorkOrderCompletion';
import { useSimCategories, resolveCategoryKey } from '@/hooks/useSimCategories';
import { getIconByKey } from '@/lib/sim-icons';
import { ImportChallengeDialog, type MappedChallengeData } from '@/components/admin/ImportChallengeDialog';
import { WorkOrderEditDialog } from '@/components/admin/WorkOrderEditDialog';
import { SimCategoryEditDialog } from '@/components/admin/SimCategoryEditDialog';
import { useSaveSimCategory } from '@/hooks/useSaveSimCategory';
import type { SimCategory } from '@/hooks/useSimCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Flame, Clock, Trophy, Target, Zap, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Tenant } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const WorkOrders = () => {
  const [activeFilter, setActiveFilter] = useState<WorkOrderFilter>('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [importedData, setImportedData] = useState<MappedChallengeData | null>(null);
  const [editingCategory, setEditingCategory] = useState<SimCategory | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const { subscribedGames } = useChannelSubscriptions();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const saveCategory = useSaveSimCategory();

  const { data: allWorkOrders = [], isLoading: loadingWorkOrders } = useWorkOrders('all');
  const { data: completions = [] } = useWorkOrderCompletions();
  const { data: categories = [] } = useSimCategories();

  const completedWorkOrderIds = useMemo(
    () => new Set(completions.filter((c) => c.status === 'completed').map((c) => c.work_order_id)),
    [completions]
  );

  const { data: communities = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*').order('name', { ascending: true });
      return (data || []).map((t) => ({
        id: t.id, name: t.name, slug: t.slug, brand_color: t.brand_color,
        logo_url: t.logo_url, created_at: t.created_at,
      })) as Tenant[];
    },
  });

  // Resolve category for each work order (override > default game mapping)
  const woWithCategory = useMemo(
    () =>
      allWorkOrders.map((wo) => ({
        ...wo,
        resolved_category: resolveCategoryKey(
          { game_title: wo.game_title, category_key: (wo as unknown as { category_key?: string | null }).category_key ?? null },
          categories
        ),
      })),
    [allWorkOrders, categories]
  );

  const filteredWorkOrders = useMemo(() => {
    if (activeFilter === 'all') return woWithCategory;
    if (activeFilter === 'for-you') return woWithCategory.filter((wo) => subscribedGames.includes(wo.game_title));
    return woWithCategory.filter((wo) => wo.resolved_category === activeFilter);
  }, [woWithCategory, activeFilter, subscribedGames]);

  const workOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: woWithCategory.length,
      'for-you': woWithCategory.filter((wo) => subscribedGames.includes(wo.game_title)).length,
    };
    categories.forEach((c) => {
      counts[c.key] = woWithCategory.filter((wo) => wo.resolved_category === c.key).length;
    });
    return counts;
  }, [woWithCategory, subscribedGames, categories]);

  // Stable, data-driven community badge:
  //  - tenant_id IS NULL → fixed "FGN Global" first-party badge
  //  - tenant_id IS SET  → that real tenant
  // Never random — random assignment implied partner relationships that do not exist.
  const communityMap = useMemo(
    () => Object.fromEntries(communities.map((c) => [c.id, c])) as Record<string, Tenant>,
    [communities]
  );
  const fgnGlobalCommunity = useMemo(
    () => communities.find((c) => c.slug === 'fgn'),
    [communities]
  );
  const resolveCommunity = (tenantId: string | null | undefined) =>
    (tenantId ? communityMap[tenantId] : fgnGlobalCommunity) ?? fgnGlobalCommunity;

  if (loadingWorkOrders) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 w-72 shrink-0 rounded-xl" />)}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const heroStats = [
    { value: `${allWorkOrders.length}`, label: 'Active Orders', highlight: true },
    ...categories.map((c) => ({
      value: `${woWithCategory.filter((wo) => wo.resolved_category === c.key).length}`,
      label: c.title,
    })),
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHero
          title="Work Orders"
          subtitle="Browse and manage training scenarios. Complete challenges, earn XP, and track your progress across all simulation platforms."
          backgroundImage="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=600&fit=crop"
          {...(isAdmin
            ? {
                primaryAction: {
                  label: 'New Work Order',
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => setShowImportDialog(true),
                },
              }
            : {})}
          secondaryAction={{ label: 'Filter', icon: <Filter className="h-4 w-4" /> }}
          stats={heroStats}
        />

        <WorkOrderFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          workOrderCounts={workOrderCounts}
        />

        {filteredWorkOrders.length > 0 && (
          <HorizontalCarousel title="Trending Now" subtitle="Most popular training scenarios this week" icon={<Flame className="h-5 w-5" />}>
            {filteredWorkOrders.slice(0, 6).map((wo, idx) => (
              <div key={wo.id} className="w-72 shrink-0 snap-start">
                <EventCard workOrder={wo} isCompleted={completedWorkOrderIds.has(wo.id)} community={resolveCommunity(wo.tenant_id)} variant={idx === 0 ? 'featured' : 'default'} />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {filteredWorkOrders.length > 0 && (
          <HorizontalCarousel title="Recently Added" subtitle="Fresh scenarios just dropped" icon={<Zap className="h-5 w-5" />}>
            {filteredWorkOrders.slice(0, 4).map((wo) => (
              <div key={`recent-${wo.id}`} className="w-80 shrink-0 snap-start">
                <EventCard workOrder={wo} isCompleted={completedWorkOrderIds.has(wo.id)} community={resolveCommunity(wo.tenant_id)} variant="compact" />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Per-category carousels + Deep Dive resources */}
        {categories.map((cat) => {
          const catItems = filteredWorkOrders.filter((wo) => wo.resolved_category === cat.key);
          if (catItems.length === 0 && cat.deep_dive_resources.length === 0) return null;
          // Hide a category's main carousel when the user explicitly filtered to it (already shown via Trending/Recent above)
          const showMain = catItems.length > 0 && activeFilter !== cat.key;
          const Icon = getIconByKey(cat.icon_key);
          return (
            <div key={cat.key} className="space-y-6">
              {isAdmin && (
                <div className="container mx-auto px-4 -mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingCategory(cat); setShowCategoryDialog(true); }}
                  >
                    <Edit className="h-3 w-3" /> Edit "{cat.title}"
                  </Button>
                </div>
              )}
              {showMain && (
                <HorizontalCarousel title={cat.title} subtitle={cat.subtitle ?? undefined} icon={<Icon className="h-5 w-5" style={{ color: cat.accent_color }} />}>
                  {catItems.map((wo) => (
                    <div key={`${cat.key}-${wo.id}`} className="w-72 shrink-0 snap-start">
                      <EventCard workOrder={wo} isCompleted={completedWorkOrderIds.has(wo.id)} community={resolveCommunity(wo.tenant_id)} />
                    </div>
                  ))}
                </HorizontalCarousel>
              )}
              {cat.deep_dive_resources.length > 0 && (activeFilter === 'all' || activeFilter === cat.key || catItems.length > 0) && (
                <HorizontalCarousel title={`Deep Dive: ${cat.title}`} subtitle="Extended training resources and career pathways" icon={<Icon className="h-5 w-5" style={{ color: cat.accent_color }} />}>
                  {cat.deep_dive_resources.map((r) => {
                    const RIcon = getIconByKey(r.iconKey);
                    return (
                      <div key={r.key} className="w-80 shrink-0 snap-start">
                        <ExternalResourceCard
                          title={r.title}
                          description={r.description}
                          href={r.href}
                          icon={<RIcon className="h-6 w-6" />}
                          ctaLabel={r.ctaLabel || 'Open'}
                          accentColor={r.accentColor}
                        />
                      </div>
                    );
                  })}
                </HorizontalCarousel>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <div className="container mx-auto px-4 flex justify-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setEditingCategory(null); setShowCategoryDialog(true); }}>
              <Plus className="h-4 w-4" /> Add Category
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate('/admin?tab=sim-categories')}>
              Manage all categories →
            </Button>
          </div>
        )}

        {filteredWorkOrders.length > 0 && (
          <HorizontalCarousel title="Active Competitions" subtitle="Compete with other operators for top rankings" icon={<Trophy className="h-5 w-5" />} viewAllLink="/work-orders?filter=competitions">
            {filteredWorkOrders.slice(0, 6).map((wo) => (
              <div key={`competition-${wo.id}`} className="w-72 shrink-0 snap-start">
                <EventCard workOrder={wo} isCompleted={completedWorkOrderIds.has(wo.id)} community={resolveCommunity(wo.tenant_id)} />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {filteredWorkOrders.length === 0 && (
          <section className="glass-card p-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Work Orders Found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {activeFilter === 'for-you' ? 'Subscribe to game channels to see personalized work orders.' : 'No work orders match your current filter.'}
            </p>
            <Button variant="outline" onClick={() => setActiveFilter('all')}>View All Work Orders</Button>
          </section>
        )}

        <section className="glass-card p-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">More Scenarios Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            New training scenarios are added weekly. Check back often or enable notifications to stay updated.
          </p>
          <Button variant="outline">Enable Notifications</Button>
        </section>

        {isAdmin && (
          <>
            <ImportChallengeDialog
              open={showImportDialog}
              onOpenChange={setShowImportDialog}
              onSelect={(data) => { setImportedData(data); setShowEditDialog(true); }}
            />
            <WorkOrderEditDialog
              open={showEditDialog}
              onOpenChange={setShowEditDialog}
              workOrder={
                importedData
                  ? {
                      id: '', title: importedData.title, description: importedData.description,
                      game_title: importedData.gameTitle, difficulty: importedData.difficulty,
                      xp_reward: importedData.xpReward, estimated_time_minutes: importedData.estimatedTime,
                      max_attempts: null, success_criteria: null, is_active: true,
                      channel_id: null, tenant_id: null, evidence_requirements: null,
                      cover_image_url: importedData.coverImageUrl,
                      fgn_origin_challenge_id: importedData.fgnOriginChallengeId,
                    }
                  : null
              }
              onSave={() => {
                setShowEditDialog(false); setImportedData(null);
                queryClient.invalidateQueries({ queryKey: ['work-orders'] });
              }}
            />
            <SimCategoryEditDialog
              open={showCategoryDialog}
              onOpenChange={setShowCategoryDialog}
              category={editingCategory}
              onSave={async (data) => {
                const ok = await saveCategory(data, editingCategory);
                if (ok) { setShowCategoryDialog(false); setEditingCategory(null); }
              }}
              onManageLibrary={() => navigate('/admin?tab=sim-categories')}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default WorkOrders;

