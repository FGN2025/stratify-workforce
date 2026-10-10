import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminHero } from '@/components/admin/AdminHero';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { WorkOrdersManager } from '@/components/admin/WorkOrdersManager';
import { SimGamesManager } from '@/components/admin/SimGamesManager';
import { SimCategoriesManager } from '@/components/admin/SimCategoriesManager';
import { SimResourcesManager } from '@/components/admin/SimResourcesManager';
import { RegistrationCodeManager } from '@/components/admin/RegistrationCodeManager';
import { EventsManager } from '@/components/admin/EventsManager';
import { EvidenceReviewQueue } from '@/components/admin/EvidenceReviewQueue';
import { TaskEvidenceReviewQueue } from '@/components/admin/TaskEvidenceReviewQueue';

import { AuthorizedAppsManager } from '@/components/admin/AuthorizedAppsManager';
import { WebhookManager } from '@/components/admin/WebhookManager';
import { CredentialTypesManager } from '@/components/admin/CredentialTypesManager';
import { SuperAdminPanel } from '@/components/admin/superadmin/SuperAdminPanel';
import { CommunityReviewQueue } from '@/components/admin/CommunityReviewQueue';
import { DiscordConnectionsManager } from '@/components/admin/DiscordConnectionsManager';
import { AIConfigManager } from '@/components/admin/AIConfigManager';
import { NotebookTelemetryDashboard } from '@/components/admin/NotebookTelemetryDashboard';
import { ChallengeSyncTester } from '@/components/admin/ChallengeSyncTester';
import { CareerPathsManager } from '@/components/admin/CareerPathsManager';
import { IntegrationHealthCheck } from '@/components/admin/IntegrationHealthCheck';
import { ProgramIntegrationHealth } from '@/components/admin/ProgramIntegrationHealth';
import { PlayOutboundPanel } from '@/components/admin/PlayOutboundPanel';
import { ChallengeLessonMappingsManager } from '@/components/admin/ChallengeLessonMappingsManager';
import { ChallengeTrackMembershipManager } from '@/components/admin/ChallengeTrackMembershipManager';
import { AdminHubTabs, type HubTab } from '@/components/admin/AdminHubTabs';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ClipboardList, FileCheck, PackageOpen, Users } from 'lucide-react';
import { PlayWebhookRetryManager } from '@/components/admin/PlayWebhookRetryManager';
import { ParityMonitorDashboard } from '@/components/admin/ParityMonitorDashboard';
import { PlayGamesSyncPanel } from '@/components/admin/PlayGamesSyncPanel';
import { MarketplaceCatalogManager } from '@/components/admin/MarketplaceCatalogManager';
import { CurationManager } from '@/components/admin/CurationManager';
import { CommunitiesAdminTable } from '@/components/admin/CommunitiesAdminTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantAdminGuard } from '@/hooks/useTenantAdminGuard';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  username: string | null;
  avatar_url: string | null;
  employability_score: number | null;
  updated_at: string;
  role?: AppRole | null;
}

export default function Admin() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { isTenantAdmin } = useTenantAdminGuard();
  const isPlatformAdmin = isAdmin || isSuperAdmin;
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkOrders: 0,
    activeSessions: 0,
    averageScore: 0,
    sessionsThisWeek: 0,
    topGame: 'ATS',
    newUsersThisWeek: 0,
  });

  // Redirect /admin to a sensible landing for the viewer's tier.
  useEffect(() => {
    if (!section) {
      navigate(isPlatformAdmin ? '/admin/overview' : '/admin/community-setup', { replace: true });
    }
  }, [section, navigate, isPlatformAdmin]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);
      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));

      setUsers(usersWithRoles);

      const { count: workOrdersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });

      const { count: sessionsCount } = await supabase
        .from('telemetry_sessions')
        .select('*', { count: 'exact', head: true });

      const avgScore =
        usersWithRoles.reduce((acc, u) => acc + (u.employability_score || 0), 0) /
        (usersWithRoles.length || 1);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newUsersThisWeek = (profiles || []).filter(
        (p) => new Date(p.created_at) >= oneWeekAgo
      ).length;

      setStats({
        totalUsers: profiles?.length || 0,
        totalWorkOrders: workOrdersCount || 0,
        activeSessions: sessionsCount || 0,
        averageScore: avgScore,
        sessionsThisWeek: sessionsCount || 0,
        topGame: 'ATS',
        newUsersThisWeek,
      });

      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('approval_status', 'approved')
        .order('name');
      
      setTenants(tenantsData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Sections only platform admins (admin / super_admin) can see.
  // Community owners/admins are limited to the community-scoped sections below.
  const PLATFORM_SECTIONS = new Set([
    'marketplace',
    'overview',
    'users',
    'learner-progress',
    'communities',
    'games',
    'sim-categories',
    'sim-resources',
    'breakroom-mapper',
    'play-sync',
    'community-review',
    'authorized-apps',
    'webhooks',
    'credential-types',
    'discord',
    'ai-config',
    'notebook-telemetry',
    'sync-tester',
    'play-webhook-retry',
    'parity-monitor',
    'super-admin',
    'challenge-mappings',
    'challenge-tracks',
  ]);

  const AccessDenied = () => (
    <div className="rounded-md border border-border bg-card/40 p-8 text-center">
      <h2 className="text-lg font-semibold mb-1">Platform admins only</h2>
      <p className="text-sm text-muted-foreground">
        This section is reserved for FGN platform administrators. As a community
        admin you can manage your own community from the Community Setup page.
      </p>
    </div>
  );

  const renderSection = () => {
    if (section && PLATFORM_SECTIONS.has(section) && !isPlatformAdmin) {
      return <AccessDenied />;
    }

    switch (section) {
      case 'overview':
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Priority work</h2>
              <p className="text-sm text-muted-foreground">Create in Studio, then review, publish and operate content in Academy.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'Create in Studio', description: 'Choose an Academy app and open the shared authoring workspace.', to: '/admin/create', icon: ArrowRight },
                { title: 'Review Inbox', description: 'Review packages and drafts received from Studio.', to: '/admin/studio-submissions', icon: PackageOpen },
                { title: 'Content Operations', description: 'Publish, assign and make quick Work Order edits.', to: '/admin/work-orders', icon: ClipboardList },
                { title: 'Evidence Review', description: 'Decide learner evidence waiting for review.', to: '/admin/evidence', icon: FileCheck },
              ].map((item) => (
                <Card key={item.to}>
                  <CardHeader>
                    <item.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" size="sm"><Link to={item.to}>Open <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'users':
        return (
          <AdminHubTabs
            title="People"
            description="Manage Academy accounts and inspect learner progress."
            active={section}
            tabs={[
              { section: 'users', label: 'Accounts', render: () => (
                <UserManagementTable users={users} isLoading={isLoading} onRoleChange={handleRoleChange} tenants={tenants} />
              ) },
              { section: 'learner-progress', label: 'Learner progress', render: () => (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Learner progress</CardTitle><CardDescription>Open the learner roster and Skill Passports.</CardDescription></CardHeader>
                  <CardContent><Button asChild><Link to="/students">Open learner progress</Link></Button></CardContent>
                </Card>
              ) },
            ]}
          />
        );
      case 'learner-progress':
        return (
          <AdminHubTabs title="People" description="Manage Academy accounts and inspect learner progress." active={section} tabs={[
            { section: 'users', label: 'Accounts', render: () => <UserManagementTable users={users} isLoading={isLoading} onRoleChange={handleRoleChange} tenants={tenants} /> },
            { section: 'learner-progress', label: 'Learner progress', render: () => <Card><CardHeader><CardTitle>Learner progress</CardTitle><CardDescription>Open the learner roster and Skill Passports.</CardDescription></CardHeader><CardContent><Button asChild><Link to="/students">Open learner progress</Link></Button></CardContent></Card> },
          ]} />
        );
      case 'communities':
      case 'community-review':
        return (
          <AdminHubTabs title="Communities" description="Manage the community registry and approval queue." active={section} tabs={[
            { section: 'communities', label: 'Registry', render: () => <CommunitiesAdminTable /> },
            ...(isSuperAdmin ? [{ section: 'community-review', label: 'Approval queue', render: () => <CommunityReviewQueue /> }] : []),
          ]} />
        );
      case 'events':
        return <EventsManager />;
      case 'work-orders':
        return <WorkOrdersManager />;
      case 'marketplace':
      case 'curation':
      case 'career-paths':
        return (
          <AdminHubTabs title="Marketplace" description="Manage app identity, catalog visibility and pathways." active={section} tabs={[
            { section: 'marketplace', label: 'Apps & disciplines', render: () => <MarketplaceCatalogManager /> },
            { section: 'curation', label: 'Curation', render: () => <CurationManager /> },
            { section: 'career-paths', label: 'Pathways', render: () => <CareerPathsManager /> },
          ]} />
        );
      case 'evidence':
        return (
          <div className="space-y-6">
            <TaskEvidenceReviewQueue />
            <EvidenceReviewQueue />
          </div>
        );

      case 'games':
      case 'sim-categories':
      case 'sim-resources':
        return (
          <AdminHubTabs
            title="Simulations"
            description="Supported simulations, the internal category taxonomy, and deep-dive resources."
            active={section}
            tabs={[
              { section: 'games', label: 'Games', render: () => <SimGamesManager /> },
              { section: 'sim-categories', label: 'Categories', render: () => <SimCategoriesManager /> },
              { section: 'sim-resources', label: 'Resources', render: () => <SimResourcesManager /> },
            ]}
          />
        );
      case 'media':
        return <MediaLibrary />;
      case 'codes':
        return <RegistrationCodeManager />;
      case 'authorized-apps':
      case 'webhooks':
      case 'credential-types':
      case 'discord':
      case 'ai-config':
        if (!isSuperAdmin) return <AccessDenied />;
        return <AdminHubTabs title="Platform Settings" description="Manage trusted applications, credentials and platform services." active={section} tabs={[
          { section: 'authorized-apps', label: 'Authorized apps', render: () => <AuthorizedAppsManager /> },
          { section: 'webhooks', label: 'Webhooks', render: () => <WebhookManager /> },
          { section: 'credential-types', label: 'Credentials', render: () => <CredentialTypesManager /> },
          { section: 'discord', label: 'Discord', render: () => <DiscordConnectionsManager /> },
          { section: 'ai-config', label: 'AI', render: () => <AIConfigManager /> },
        ]} />;
      case 'notebook-telemetry':
      case 'sync-tester':
      case 'play-webhook-retry':
      case 'parity-monitor':
      case 'play-sync': {
        if (!isSuperAdmin && section !== 'play-sync') return <AccessDenied />;
        const tabs: HubTab[] = [
          ...(isSuperAdmin ? [{ section: 'sync-tester', label: 'Health', render: () => (
            <div className="space-y-6">
              <IntegrationHealthCheck />
              <ProgramIntegrationHealth />
              <PlayOutboundPanel />
              <ChallengeSyncTester />
            </div>
          ) }] : []),
          { section: 'play-sync', label: 'Games sync', render: () => <PlayGamesSyncPanel /> },
          ...(isSuperAdmin ? [
            { section: 'play-webhook-retry', label: 'Webhook retry', render: () => <PlayWebhookRetryManager /> },
            { section: 'parity-monitor', label: 'Parity monitor', render: () => <ParityMonitorDashboard /> },
            { section: 'notebook-telemetry', label: 'Notebook telemetry', render: () => <NotebookTelemetryDashboard /> },
          ] : []),
        ];
        return <AdminHubTabs title="Integrations" description="FGN Play connection health, retries and parity." active={section} tabs={tabs} />;
      }
      case 'challenge-mappings':
      case 'challenge-tracks':
        return (
          <AdminHubTabs
            title="FGN.GG & Legacy Mappings"
            description="Review links created before Studio distribution and apply manual overrides when required."
            active={section}
            tabs={[
              { section: 'challenge-mappings', label: 'Lesson mappings', render: () => <ChallengeLessonMappingsManager /> },
              { section: 'challenge-tracks', label: 'Tracks', render: () => <ChallengeTrackMembershipManager /> },
            ]}
          />
        );
      case 'breakroom-mapper':
        // Retired: Breakroom links are set on the Work Order (in Studio, or Configurator quick edit).
        return <Navigate to="/admin/work-orders" replace />;
      case 'super-admin':
        return isSuperAdmin ? <SuperAdminPanel /> : <AccessDenied />;
      default:
        return <AccessDenied />;
    }
  };


  return (
    <AppLayout>
      <div className="container py-8 space-y-8">
        {section === 'overview' && (
          <>
            <AdminHero stats={{ totalUsers: stats.totalUsers, totalWorkOrders: stats.totalWorkOrders, activeSessions: stats.activeSessions }} isLoading={isLoading} />
            <AdminStatsGrid averageScore={stats.averageScore} sessionsThisWeek={stats.sessionsThisWeek} topGame={stats.topGame} newUsersThisWeek={stats.newUsersThisWeek} isLoading={isLoading} />
          </>
        )}

        {renderSection()}
      </div>
    </AppLayout>
  );
}
