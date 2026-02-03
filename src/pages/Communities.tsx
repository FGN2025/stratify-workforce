import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { CommunityCard } from '@/components/marketplace/CommunityCard';
import { CommunityFormDialog } from '@/components/admin/CommunityFormDialog';
import { useCommunities } from '@/hooks/useCommunities';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';
import { useUserRole } from '@/hooks/useUserRole';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Users, Plus } from 'lucide-react';
import type { Tenant } from '@/types/tenant';

const Communities = () => {
  const { communities, isLoading, refetch } = useCommunities();
  const { isAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Tenant | null>(null);
  const heroImageUrl = useSiteMediaUrl('communities_hero');

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    if (isAdmin) {
      setEditingCommunity(null);
      setShowCreateDialog(true);
    }
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
          title="Training Communities"
          subtitle="Discover training organizations and join their simulation programs to level up your skills"
          backgroundImage={heroImageUrl}
          primaryAction={isAdmin ? {
            label: 'Create Community',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleCreateClick,
          } : undefined}
          stats={[
            { value: communities.length.toString(), label: 'Communities', highlight: true },
            { value: '2,500+', label: 'Active Members' },
            { value: '180+', label: 'Work Orders' },
          ]}
        />

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
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Communities Carousel */}
        <HorizontalCarousel
          title="All Communities"
          subtitle={`${filteredCommunities.length} training organizations`}
          icon={<Users className="h-5 w-5" />}
        >
          {filteredCommunities.map((community, idx) => (
            <div key={community.id} className="w-72 shrink-0 snap-start">
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
