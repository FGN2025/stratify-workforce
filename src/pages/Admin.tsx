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
import { ChallengeLessonMappingsManager } from '@/components/admin/ChallengeLessonMappingsManager';
import { ChallengeTrackMembershipManager } from '@/components/admin/ChallengeTrackMembershipManager';
import { BreakroomMapperManager } from '@/components/admin/BreakroomMapperManager';
import { PlayWebhookRetryManager } from '@/components/admin/PlayWebhookRetryManager';
import { ParityMonitorDashboard } from '@/components/admin/ParityMonitorDashboard';
import { PlayGamesSyncPanel } from '@/components/admin/PlayGamesSyncPanel';
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
      navigate(isPlatformAdmin ? '/admin/users' : '/admin/community-setup', { replace: true });
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

  const renderSection = () => {
    switch (section) {
      case 'users':
        return (
          <UserManagementTable
            users={users}
            isLoading={isLoading}
            onRoleChange={handleRoleChange}
            tenants={tenants}
          />
        );
      case 'events':
        return <EventsManager />;
      case 'work-orders':
        return <WorkOrdersManager />;
      case 'curation':
        return <CurationManager />;
      case 'evidence':
        return <EvidenceReviewQueue />;
      case 'games':
        return <SimGamesManager />;
      case 'sim-categories':
        return <SimCategoriesManager />;
      case 'sim-resources':
        return <SimResourcesManager />;
      case 'media':
        return <MediaLibrary />;
      case 'codes':
        return <RegistrationCodeManager />;
      case 'career-paths':
        return <CareerPathsManager />;
      case 'community-review':
        return isSuperAdmin ? <CommunityReviewQueue /> : null;
      case 'authorized-apps':
        return isSuperAdmin ? <AuthorizedAppsManager /> : null;
      case 'webhooks':
        return isSuperAdmin ? <WebhookManager /> : null;
      case 'credential-types':
        return isSuperAdmin ? <CredentialTypesManager /> : null;
      case 'discord':
        return isSuperAdmin ? <DiscordConnectionsManager /> : null;
      case 'ai-config':
        return isSuperAdmin ? <AIConfigManager /> : null;
      case 'notebook-telemetry':
        return isSuperAdmin ? <NotebookTelemetryDashboard /> : null;
      case 'sync-tester':
        return isSuperAdmin ? (
          <div className="space-y-6">
            <IntegrationHealthCheck />
            <ChallengeSyncTester />
          </div>
        ) : null;
      case 'challenge-mappings':
        return <ChallengeLessonMappingsManager />;
      case 'challenge-tracks':
        return <ChallengeTrackMembershipManager />;
      case 'breakroom-mapper':
        return <BreakroomMapperManager />;
      case 'play-webhook-retry':
        return isSuperAdmin ? <PlayWebhookRetryManager /> : null;
      case 'parity-monitor':
        return isSuperAdmin ? <ParityMonitorDashboard /> : null;
      case 'play-sync':
        return <PlayGamesSyncPanel />;
      case 'super-admin':
        return isSuperAdmin ? <SuperAdminPanel /> : null;
      default:
        return (
          <UserManagementTable
            users={users}
            isLoading={isLoading}
            onRoleChange={handleRoleChange}
            tenants={tenants}
          />
        );
    }
  };

  return (
    <AppLayout>
      <div className="container py-8 space-y-8">
        <AdminHero
          stats={{
            totalUsers: stats.totalUsers,
            totalWorkOrders: stats.totalWorkOrders,
            activeSessions: stats.activeSessions,
          }}
          isLoading={isLoading}
        />

        <AdminStatsGrid
          averageScore={stats.averageScore}
          sessionsThisWeek={stats.sessionsThisWeek}
          topGame={stats.topGame}
          newUsersThisWeek={stats.newUsersThisWeek}
          isLoading={isLoading}
        />

        {renderSection()}
      </div>
    </AppLayout>
  );
}
