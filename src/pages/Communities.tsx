import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { CommunityCard } from '@/components/marketplace/CommunityCard';
import { CommunityFormDialog } from '@/components/admin/CommunityFormDialog';
import { MyCommunities } from '@/components/communities/MyCommunities';
import { useCommunities, useIsCommunityManager } from '@/hooks/useCommunities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Users, Plus } from 'lucide-react';
import type { Tenant } from '@/types/tenant';

const Communities = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole() as ReturnType<typeof useUserRole> & { isLoading?: boolean };
  const { isManager, isLoading: managerLoading } = useIsCommunityManager();
  const scope = isAdmin ? 'all' : isManager ? 'managed' : 'directory';
  const { communities, isLoading: listLoading, refetch } = useCommunities(scope, !roleLoading && !managerLoading);
  const isLoading = listLoading || !!roleLoading || managerLoading;
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [verifiedFilter, setVerifiedFilter] = useState<'any' | 'verified' | 'unverified'>('any');
  const [parentFilter, setParentFilter] = useState<'any' | 'top' | 'child'>('any');
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Tenant | null>(null);
  const heroImageUrl = useSiteMediaUrl('communities_hero');

  const typeOptions = [...new Set(communities.map(c => c.category_type).filter(Boolean))] as string[];
  const activeFilterCount = typeFilter.length + (verifiedFilter !== 'any' ? 1 : 0) + (parentFilter !== 'any' ? 1 : 0);
  const filteredCommunities = communities.filter(c => {
    const q = searchQuery.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
    if (!isAdmin) return true;
    if (typeFilter.length && !typeFilter.includes(c.category_type ?? '')) return false;
    if (verifiedFilter === 'verified' && !c.is_verified) return false;
    if (verifiedFilter === 'unverified' && c.is_verified) return false;
    if (parentFilter === 'top' && c.parent_tenant_id) return false;
    if (parentFilter === 'child' && !c.parent_tenant_id) return false;
    return true;
  });
  const label = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());

  const handleCreateClick = () => {
    setEditingCommunity(null);
    setShowCreateDialog(true);
  };

  const handleEditCommunity = (community: Tenant) => {
    setEditingCommunity(community);
    setShowCreateDialog(true);
  };

  const handleSave = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Hero Section */}
        <PageHero
          title="Communities"
          subtitle={isManager && !isAdmin ? "The communities you manage and the organizations under them." : "Join your school, employer or training program to unlock its courses and Work Orders."}
          backgroundImage={heroImageUrl}
          primaryAction={isAdmin ? {
            label: 'Create Community',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleCreateClick,
          } : undefined}
          stats={[
            { value: communities.length.toString(), label: 'Communities', highlight: true },
            { value: communities.reduce((sum, c) => sum + (c.member_count ?? 0), 0).toLocaleString(), label: 'Total Members' },
          ]}
        />

        {/* My Communities Section (admins only) */}
        {user && isAdmin && (
          <MyCommunities onCreateClick={handleCreateClick} />
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-4" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Organization type</p>
                  {typeOptions.map(t => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={typeFilter.includes(t)}
                        onCheckedChange={(v) => setTypeFilter(prev => v ? [...prev, t] : prev.filter(x => x !== t))}
                      />
                      {label(t)}
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Verification</p>
                  {(['any', 'verified', 'unverified'] as const).map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={verifiedFilter === v} onCheckedChange={() => setVerifiedFilter(v)} />
                      {label(v)}
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Hierarchy</p>
                  {([['any', 'Any'], ['top', 'Top-level only'], ['child', 'Child organizations']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={parentFilter === v} onCheckedChange={() => setParentFilter(v)} />
                      {l}
                    </label>
                  ))}
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setTypeFilter([]); setVerifiedFilter('any'); setParentFilter('any'); }}>
                    Clear filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Communities Carousel */}
        <HorizontalCarousel
          title={isManager && !isAdmin ? "Your Communities" : "All Communities"}
          subtitle={`${filteredCommunities.length} communities`}
          icon={<Users className="h-5 w-5" />}
        >
          {filteredCommunities.map((community, idx) => (
            <div key={community.id} className="w-[85vw] sm:w-72 lg:w-80 shrink-0 snap-start">
              <CommunityCard 
                community={community}
                featured={idx === 0}
                onEdit={isAdmin ? () => handleEditCommunity(community) : undefined}
              />
            </div>
          ))}
        </HorizontalCarousel>

        {filteredCommunities.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No communities found</p>
            {searchQuery && (
              <p className="text-sm text-muted-foreground/70">
                Try a different search term
              </p>
            )}
          </div>
        )}
      </div>

      {/* Community Form Dialog */}
      <CommunityFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        community={editingCommunity}
        allCommunities={communities}
        onSave={handleSave}
      />
    </AppLayout>
  );
};

export default Communities;
