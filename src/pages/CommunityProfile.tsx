import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EventCard } from '@/components/marketplace/EventCard';
import { TenantBreadcrumb } from '@/components/TenantBreadcrumb';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { JoinCommunityButton } from '@/components/communities/JoinCommunityButton';
import { MembershipReviewQueue } from '@/components/communities/MembershipReviewQueue';
import { WorkOrderAssignmentManager } from '@/components/communities/WorkOrderAssignmentManager';
import { JoinCtaBanner } from '@/components/marketplace/JoinCtaBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useIsManager } from '@/hooks/useMembershipRequest';
import { usePendingMembershipCount } from '@/hooks/usePendingMembershipCount';
import { 
  Users, 
  Trophy, 
  Calendar, 
  Star, 
  MapPin, 
  Link as LinkIcon,
  ExternalLink,
  Clock,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import type { Tenant, WorkOrder, GameTitle } from '@/types/tenant';

const CommunityProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Tenant | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Manager hooks - called unconditionally, enabled based on community.id
  const { data: isManager } = useIsManager(community?.id);
  const { data: pendingCount = 0 } = usePendingMembershipCount(community?.id);

  useEffect(() => {
    async function fetchCommunity() {
      if (!slug) return;

      setIsLoading(true);

      // Signed-in users (members/managers) get the full tenant row; anonymous
      // visitors fall back to the safe public projection.
      let tenantData: Record<string, unknown> | null = null;
      const { data: fullRow } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      tenantData = fullRow;

      if (!tenantData) {
        const { data: publicRow } = await supabase
          .from('public_communities')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        tenantData = publicRow;
      }

      if (tenantData) {
        setCommunity(tenantData as unknown as Tenant);

        // Marketing-safe work order projection (curation still applied in the view)
        const { data: woData } = await supabase
          .from('public_work_orders')
          .select('*')
          .eq('tenant_id', tenantData.id as string)
          .order('created_at', { ascending: false });

        if (woData) {
          const typedWorkOrders: WorkOrder[] = woData.map(wo => ({
            id: wo.id,
            tenant_id: wo.tenant_id,
            title: wo.title,
            generated_name: wo.generated_name ?? null,
            description: wo.description,
            game_title: wo.game_title as GameTitle,
            success_criteria: {},
            is_active: wo.is_active ?? true,
            created_at: wo.created_at,
            cover_image_url: wo.cover_image_url,
            metadata: null,
          }));
          setWorkOrders(typedWorkOrders);
        }
      }

      setIsLoading(false);
    }

    fetchCommunity();
  }, [slug]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="flex gap-6">
            <Skeleton className="h-24 w-24 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!community) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h1 className="text-2xl font-bold">Community not found</h1>
          <p className="text-muted-foreground mt-2">The community you're looking for doesn't exist.</p>
        </div>
      </AppLayout>
    );
  }

  const stats = {
    members: community.member_count ?? 0,
    events: workOrders.length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Tenant Breadcrumb */}
        <TenantBreadcrumb currentTenant={community} />

        {/* Cover Banner */}
        <div 
          className="relative h-48 rounded-xl overflow-hidden bg-cover bg-center"
          style={{ 
            backgroundImage: community.cover_image_url
              ? `url(${community.cover_image_url})`
              : undefined,
            background: !community.cover_image_url
              ? `linear-gradient(135deg, ${community.brand_color}40 0%, ${community.brand_color}10 100%)`
              : undefined,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Profile Header */}
        <div className="relative -mt-20 px-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
              <AvatarImage src={community.logo_url || ''} />
              <AvatarFallback 
                className="text-3xl font-bold text-white"
                style={{ backgroundColor: community.brand_color }}
              >
                {community.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 pt-4 sm:pt-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">{community.name}</h1>
                {community.is_verified && (
                  <Badge 
                    variant="outline" 
                    className="text-[10px]"
                    style={{ borderColor: community.brand_color, color: community.brand_color }}
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Verified
                  </Badge>
                )}
              </div>
              
              <p className="text-muted-foreground mt-1">@{community.slug}</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                {community.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {community.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(community.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {community.website_url && (
                  <span className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    <a href={community.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {community.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 sm:pt-8">
              <JoinCommunityButton 
                tenantId={community.id} 
                brandColor={community.brand_color} 
              />
              {community.website_url && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => window.open(community.website_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="glass-card p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="font-data text-2xl text-foreground">{stats.members}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div className="glass-card p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="font-data text-2xl text-foreground">{stats.events}</p>
            <p className="text-xs text-muted-foreground">Work Orders</p>
          </div>
        </div>

        {/* Signed-out conversion banner */}
        {!user && (
          <JoinCtaBanner message={`Create a free account to join ${community.name} and start training.`} />
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="events" className="mt-8">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="events">Work Orders</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            {isManager && (
              <TabsTrigger value="requests" className="relative">
                <UserCheck className="h-4 w-4 mr-1" />
                Requests
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="assignments" className="gap-1">
                <ClipboardList className="h-4 w-4" />
                Assignments
              </TabsTrigger>
            )}
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            {workOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workOrders.map((wo) => (
                  <EventCard 
                    key={wo.id}
                    workOrder={wo}
                    community={community}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No work orders yet</p>
                <p className="text-sm text-muted-foreground/70">This community hasn't created any training scenarios.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <div className="glass-card p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Member list coming soon</p>
            </div>
          </TabsContent>

          {isManager && (
            <TabsContent value="requests" className="mt-6">
              <MembershipReviewQueue tenantId={community.id} />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="assignments" className="mt-6">
              <div className="glass-card p-6">
                <WorkOrderAssignmentManager tenantId={community.id} />
              </div>
            </TabsContent>
          )}

          <TabsContent value="leaderboard" className="mt-6">
            <div className="glass-card p-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Leaderboard coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-2">About {community.name}</h3>
              <p className="text-muted-foreground">
                {community.description || `${community.name} is a professional skills community focused on developing skilled operators through simulation-based learning. Our members participate in realistic work scenarios to build practical skills in a safe environment.`}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CommunityProfile;
