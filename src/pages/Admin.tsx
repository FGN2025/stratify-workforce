import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminHero } from '@/components/admin/AdminHero';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { SimGamesManager } from '@/components/admin/SimGamesManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  const [users, setUsers] = useState<UserWithRole[]>([]);
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
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to users
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);
      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));

      setUsers(usersWithRoles);

      // Fetch work orders count
      const { count: workOrdersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });

      // Fetch sessions count
      const { count: sessionsCount } = await supabase
        .from('telemetry_sessions')
        .select('*', { count: 'exact', head: true });

      // Calculate average score
      const avgScore =
        usersWithRoles.reduce((acc, u) => acc + (u.employability_score || 0), 0) /
        (usersWithRoles.length || 1);

      // Calculate new users this week
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
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
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

  return (
    <AppLayout>
      <div className="container py-8 space-y-8">
        {/* Hero Section */}
        <AdminHero
          stats={{
            totalUsers: stats.totalUsers,
            totalWorkOrders: stats.totalWorkOrders,
            activeSessions: stats.activeSessions,
          }}
          isLoading={isLoading}
        />

        {/* Stats Grid */}
        <AdminStatsGrid
          averageScore={stats.averageScore}
          sessionsThisWeek={stats.sessionsThisWeek}
          topGame={stats.topGame}
          newUsersThisWeek={stats.newUsersThisWeek}
          isLoading={isLoading}
        />

        {/* Tabbed Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="games">SIM Games</TabsTrigger>
            <TabsTrigger value="media">Media Library</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagementTable
                  users={users}
                  isLoading={isLoading}
                  onRoleChange={handleRoleChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <SimGamesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <MediaLibrary />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
