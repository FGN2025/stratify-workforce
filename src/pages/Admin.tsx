import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminHero } from '@/components/admin/AdminHero';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { WorkOrdersManager } from '@/components/admin/WorkOrdersManager';
import { SimGamesManager } from '@/components/admin/SimGamesManager';
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
import { ChallengeSyncTester } from '@/components/admin/ChallengeSyncTester';
import { CareerPathsManager } from '@/components/admin/CareerPathsManager';
import { IntegrationHealthCheck } from '@/components/admin/IntegrationHealthCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { usePendingEvidenceCount } from '@/hooks/usePendingEvidenceCount';
import { usePendingCommunityCount } from '@/hooks/usePendingCommunityCount';
import { Users, Calendar, ClipboardList, FileCheck, Gamepad2, Box, Image, KeyRound, Route, MessageSquare, AppWindow, Webhook, Award, MessageCircle, Bot, Zap, Shield } from 'lucide-react';
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
  const { isSuperAdmin } = useUserRole();
  const { data: pendingEvidenceCount = 0 } = usePendingEvidenceCount();
  const { data: pendingCommunityCount = 0 } = usePendingCommunityCount();
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

  const adminSections = [
    {
      value: 'users',
      label: 'User Management',
      icon: Users,
      content: (
        <UserManagementTable
          users={users}
          isLoading={isLoading}
          onRoleChange={handleRoleChange}
          tenants={tenants}
        />
      ),
    },
    {
      value: 'events',
      label: 'Events',
      icon: Calendar,
      content: <EventsManager />,
    },
    {
      value: 'work-orders',
      label: 'Work Orders',
      icon: ClipboardList,
      content: <WorkOrdersManager />,
    },
    {
      value: 'evidence',
      label: 'Evidence Review',
      icon: FileCheck,
      badge: pendingEvidenceCount > 0 ? (pendingEvidenceCount > 99 ? '99+' : String(pendingEvidenceCount)) : undefined,
      content: <EvidenceReviewQueue />,
    },
    {
      value: 'games',
      label: 'SIM Games',
      icon: Gamepad2,
      content: <SimGamesManager />,
    },
    {
      value: 'sim-resources',
      label: 'SIM Resources',
      icon: Box,
      content: <SimResourcesManager />,
    },
    {
      value: 'media',
      label: 'Media Library',
      icon: Image,
      content: <MediaLibrary />,
    },
    {
      value: 'codes',
      label: 'Registration Codes',
      icon: KeyRound,
      content: <RegistrationCodeManager />,
    },
    {
      value: 'career-paths',
      label: 'Skills Paths',
      icon: Route,
      content: <CareerPathsManager />,
    },
  ];

  const superAdminSections = [
    {
      value: 'community-review',
      label: 'Community Review',
      icon: MessageSquare,
      badge: pendingCommunityCount > 0 ? (pendingCommunityCount > 99 ? '99+' : String(pendingCommunityCount)) : undefined,
      content: <CommunityReviewQueue />,
    },
    {
      value: 'authorized-apps',
      label: 'Authorized Apps',
      icon: AppWindow,
      content: <AuthorizedAppsManager />,
    },
    {
      value: 'webhooks',
      label: 'Webhooks',
      icon: Webhook,
      content: <WebhookManager />,
    },
    {
      value: 'credential-types',
      label: 'Credential Types',
      icon: Award,
      content: <CredentialTypesManager />,
    },
    {
      value: 'discord',
      label: 'Discord',
      icon: MessageCircle,
      colorClass: 'text-[#5865F2]',
      content: <DiscordConnectionsManager />,
    },
    {
      value: 'ai-config',
      label: 'AI Config',
      icon: Bot,
      colorClass: 'text-emerald-400',
      content: <AIConfigManager />,
    },
    {
      value: 'sync-tester',
      label: 'FGN Play',
      icon: Zap,
      colorClass: 'text-amber-400',
      content: (
        <div className="space-y-6">
          <IntegrationHealthCheck />
          <ChallengeSyncTester />
        </div>
      ),
    },
    {
      value: 'super-admin',
      label: 'Super Admin',
      icon: Shield,
      colorClass: 'text-amber-400',
      content: <SuperAdminPanel />,
    },
  ];

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

        {/* Admin Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Administration</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem
                  key={section.value}
                  value={section.value}
                  className="border border-border/50 rounded-lg bg-card px-1 data-[state=open]:bg-card"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{section.label}</span>
                      {section.badge && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {section.content}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Super Admin Sections */}
        {isSuperAdmin && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-primary">Super Admin</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {superAdminSections.map((section) => {
                const Icon = section.icon;
                return (
                  <AccordionItem
                    key={section.value}
                    value={section.value}
                    className="border border-primary/20 rounded-lg bg-card px-1 data-[state=open]:bg-card"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${section.colorClass || 'text-primary'}`} />
                        <span className={`font-medium ${section.colorClass || 'text-primary'}`}>{section.label}</span>
                        {section.badge && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {section.content}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </div>
    </AppLayout>
  );
}