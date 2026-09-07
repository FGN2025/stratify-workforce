import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BookOpen,
  Building2,
  ClipboardList,
  ExternalLink,
  Loader2,
  Settings,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenant } from '@/contexts/TenantContext';
import { CommunityMembersPanel } from '@/components/admin/community/CommunityMembersPanel';
import { CommunityWorkOrdersPanel } from '@/components/admin/community/CommunityWorkOrdersPanel';
import { CommunityCoursesPanel } from '@/components/admin/community/CommunityCoursesPanel';

const TABS = ['overview', 'members', 'work-orders', 'courses'] as const;
type TabKey = (typeof TABS)[number];

export default function CommunityDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { setTenantBySlug } = useTenant();
  const isPlatformAdmin = isAdmin || isSuperAdmin;

  const raw = params.get('tab') as TabKey | null;
  const tab: TabKey = raw && (TABS as readonly string[]).includes(raw) ? raw : 'overview';
  const setTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  const tenantQuery = useQuery({
    queryKey: ['community-dashboard-tenant', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, description, member_count, is_verified, category_type')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tenant = tenantQuery.data;

  const accessQuery = useQuery({
    queryKey: ['community-dashboard-access', user?.id, tenant?.id],
    enabled: !!user?.id && !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_tenant_admin', {
        p_user_id: user!.id,
        p_tenant_id: tenant!.id,
      });
      if (error) return false;
      return !!data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['community-dashboard-stats', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const [members, pending, workOrders, courses] = await Promise.all([
        supabase
          .from('community_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant!.id)
          .eq('request_status', 'approved'),
        supabase
          .from('community_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant!.id)
          .eq('request_status', 'pending'),
        supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant!.id),
        supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant!.id),
      ]);
      return {
        members: members.count ?? 0,
        pending: pending.count ?? 0,
        workOrders: workOrders.count ?? 0,
        courses: courses.count ?? 0,
      };
    },
  });

  const isLoading = tenantQuery.isLoading || (!!tenant && accessQuery.isLoading);
  const canManage = isPlatformAdmin || !!accessQuery.data;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading community…
        </div>
      </AppLayout>
    );
  }

  if (!tenant) {
    return (
      <AppLayout>
        <div className="container py-16">
          <Card>
            <CardHeader>
              <CardTitle>Community not found</CardTitle>
              <CardDescription>
                We couldn't find a community with that address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/communities">Back to communities</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!canManage) {
    return (
      <AppLayout>
        <div className="container py-16">
          <Card>
            <CardHeader>
              <CardTitle>You can't manage this community</CardTitle>
              <CardDescription>
                Only the owners and admins of {tenant.name} can open its dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const stats = statsQuery.data;

  return (
    <AppLayout>
      <div className="container space-y-6 py-6 sm:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={tenant.logo_url ?? undefined} />
              <AvatarFallback className="rounded-lg">
                <Building2 className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {tenant.name}
                </h1>
                {tenant.is_verified && <Badge variant="secondary">Verified</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Manage members, work orders and courses for this community.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (tenant.slug) setTenantBySlug(tenant.slug);
              }}
              asChild={false}
            >
              <Settings className="h-4 w-4" /> Set as active
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={`/community/${tenant.slug}`}>
                View public page <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Users className="h-4 w-4" />} label="Members" value={stats?.members} />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Pending requests"
            value={stats?.pending}
          />
          <StatCard
            icon={<ClipboardList className="h-4 w-4" />}
            label="Work orders"
            value={stats?.workOrders}
          />
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="Courses" value={stats?.courses} />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" /> Members
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Work Orders
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" /> Courses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
                <CardDescription>
                  {tenant.description || 'No description added yet.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/community-setup">Community setup & branding</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/curation">Curate shared content</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/events">Events</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <CommunityMembersPanel tenantId={tenant.id} />
          </TabsContent>
          <TabsContent value="work-orders">
            <CommunityWorkOrdersPanel tenantId={tenant.id} />
          </TabsContent>
          <TabsContent value="courses">
            <CommunityCoursesPanel tenantId={tenant.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
}) {
  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-data text-2xl font-semibold">{value ?? '—'}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}
