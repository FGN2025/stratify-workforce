import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { CommunityCard } from '@/components/marketplace/CommunityCard';
import { supabase } from '@/integrations/supabase/client';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Users, Plus } from 'lucide-react';
import type { Tenant } from '@/types/tenant';

const Communities = () => {
  const [communities, setCommunities] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const heroImageUrl = useSiteMediaUrl('communities_hero');

  useEffect(() => {
    async function fetchCommunities() {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name', { ascending: true });

      if (data && !error) {
        const typedTenants: Tenant[] = data.map(t => ({
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

    fetchCommunities();
  }, []);

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          primaryAction={{
            label: 'Create Community',
            icon: <Plus className="h-4 w-4" />,
          }}
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

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map((community, idx) => (
            <CommunityCard 
              key={community.id}
              community={community}
              featured={idx === 0}
            />
          ))}
        </div>

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
    </AppLayout>
  );
};

export default Communities;
