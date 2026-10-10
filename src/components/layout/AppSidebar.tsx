import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  User, 
  Users, 
  Trophy,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
  ChevronDown,
  Target,
  Code,
  HelpCircle,
  FileCheck,
  KeyRound,
  Zap,
  Shield,
  Calendar,
  Building2,
  PackageOpen,
  Sparkles,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantAdminGuard } from '@/hooks/useTenantAdminGuard';
import { usePendingEvidenceCount } from '@/hooks/usePendingEvidenceCount';
import { usePendingCommunityCount } from '@/hooks/usePendingCommunityCount';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

// Three separate concepts. Program browsing never changes organization or access.
const navGroups = [
  {
    label: 'Explore programs',
    items: [
      { title: 'Apps', url: '/apps', icon: Target },
      { title: 'Course Catalog', url: '/learn', icon: GraduationCap },
      { title: 'Careers', url: '/careers', icon: Target },
    ],
  },
  {
    label: 'My learning',
    items: [
      { title: 'Workspace', url: '/workspace', icon: LayoutDashboard },
      { title: 'Assignments', url: '/work-orders', icon: ClipboardList },
      { title: 'Skill Passport', url: '/profile', icon: User },
      { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'My organization',
    items: [
      { title: 'Membership', url: '/communities', icon: Users },
      { title: 'Cohort Events', url: '/events', icon: CalendarDays },
      { title: 'Help', url: '/help', icon: HelpCircle },
    ],
  },
];
const mainNavItems = navGroups.flatMap((g) => g.items);

const publicNavItems = [
  { title: 'Discover', url: '/', icon: LayoutDashboard },
  { title: 'Learn', url: '/learn', icon: GraduationCap },
  { title: 'Communities', url: '/communities', icon: Users },
];

type AdminTier = 'community' | 'platform';

type AdminLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
  badgeKey?: 'evidence' | 'community';
  tier: AdminTier;
};
const adminSubItems: AdminLeaf[] = [
  // Community operations. Authoring remains in Studio.
  { title: 'Overview', url: '/admin/community-setup', icon: LayoutDashboard, tier: 'community' },
  { title: 'People', url: '/students', icon: Users, tier: 'community' },
  { title: 'Assignments', url: '/admin/work-orders', icon: ClipboardList, tier: 'community' },
  { title: 'Evidence Review', url: '/admin/evidence', icon: FileCheck, badgeKey: 'evidence' as const, tier: 'community' },
  { title: 'Events', url: '/admin/events', icon: Calendar, tier: 'community' },
  { title: 'Catalog', url: '/admin/curation', icon: Target, tier: 'community' },
  { title: 'Access', url: '/admin/codes', icon: KeyRound, tier: 'community' },

  // Platform operations. Creation starts in Studio; Academy reviews and governs.
  { title: 'Overview', url: '/admin/overview', icon: LayoutDashboard, tier: 'platform' },
  { title: 'Create in Studio', url: '/admin/create', icon: Sparkles, tier: 'platform' },
  { title: 'Review Inbox', url: '/admin/studio-submissions', icon: PackageOpen, tier: 'platform' },
  { title: 'Content Operations', url: '/admin/work-orders', icon: ClipboardList, tier: 'platform' },
  { title: 'Evidence Review', url: '/admin/evidence', icon: FileCheck, badgeKey: 'evidence' as const, tier: 'platform' },
  { title: 'People', url: '/admin/users', icon: Users, tier: 'platform' },
  { title: 'Communities', url: '/admin/communities', icon: Building2, badgeKey: 'community', tier: 'platform' },
  { title: 'Marketplace', url: '/admin/marketplace', icon: Target, tier: 'platform' },
  { title: 'Integrations', url: '/admin/play-sync', icon: Zap, tier: 'platform' },
];

const superAdminSubItems = [
  { title: 'Platform Settings', url: '/admin/authorized-apps', icon: Shield },
  { title: 'Super Admin', url: '/admin/super-admin', icon: Shield },
];

const standaloneAdminItems = [
  { title: 'Developers', url: '/developers', icon: Code, developerOnly: true },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isDeveloper, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { isTenantAdmin } = useTenantAdminGuard();
  
  // Pending counts for badges
  const { data: pendingEvidenceCount = 0 } = usePendingEvidenceCount();
  const { data: pendingCommunityCount = 0 } = usePendingCommunityCount();

  const badgeCounts: Record<string, number> = {
    evidence: pendingEvidenceCount,
    community: isSuperAdmin ? pendingCommunityCount : 0,
  };

  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path === '/admin/users') return location.pathname === '/admin/learner-progress' || location.pathname === '/students';
    if (path === '/admin/communities') return location.pathname === '/admin/community-review';
    if (path === '/admin/marketplace') return ['/admin/curation', '/admin/career-paths', '/admin/games', '/admin/sim-categories', '/admin/sim-resources'].includes(location.pathname);
    if (path === '/admin/play-sync') return ['/admin/sync-tester', '/admin/play-webhook-retry', '/admin/parity-monitor', '/admin/notebook-telemetry', '/admin/challenge-mappings', '/admin/challenge-tracks', '/admin/challenge-registry', '/admin/activity-mapping'].includes(location.pathname);
    if (path === '/admin/authorized-apps') return ['/admin/webhooks', '/admin/credential-types', '/admin/discord', '/admin/ai-config'].includes(location.pathname);
    return false;
  };
  
  const isAuthenticated = Boolean(user);
  const navigationItems = isAuthenticated ? mainNavItems : publicNavItems;
  const showPlatformAdmin = isAuthenticated && !authLoading && !roleLoading && isAdmin;
  const showCommunityAdmin = isAuthenticated && !authLoading && !roleLoading && (isAdmin || isTenantAdmin);
  const showAdmin = showPlatformAdmin || showCommunityAdmin;
  const showSuperAdmin = isAuthenticated && !authLoading && !roleLoading && isSuperAdmin;
  const showDeveloper = isAuthenticated && !authLoading && !roleLoading && (isDeveloper || isAdmin);

  const visibleAdminSubItems = adminSubItems.filter((item) => {
    if (showPlatformAdmin) return item.tier === 'platform';
    return item.tier === 'community' && showCommunityAdmin;
  });

  const visibleStandaloneItems = standaloneAdminItems.filter((item) => {
    if ('adminOnly' in item && item.adminOnly) return showPlatformAdmin;
    if ('developerOnly' in item && (item as any).developerOnly) return showDeveloper;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-0 h-16">
        <NavLink to={isAuthenticated ? '/workspace' : '/'} className={cn(
          "flex items-center justify-center h-full w-full overflow-hidden",
        )}>
          <img
            src="/fgn-logo.png"
            alt="FGN Academy"
            className={cn("object-contain", collapsed ? "h-9 w-9" : "h-full w-auto max-w-full")}
          />
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="scrollbar-dark">
        {/* Main Navigation — three separate concepts when signed in */}
        {(isAuthenticated ? navGroups : [{ label: '', items: navigationItems }]).map((group) => (
        <SidebarGroup key={group.label || 'public'}>
          {group.label && (
            <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 transition-colors",
                        isActive(item.url) 
                          ? "text-primary bg-primary/10" 
                          : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        ))}


        {/* Admin Section */}
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
               {showPlatformAdmin ? 'Academy Operations' : 'Community Admin'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Admin Dashboard collapsible */}
                <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Admin Dashboard"
                        className={cn(
                          "w-full justify-between text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent",
                          isOnAdminPage && "text-primary bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-4 w-4" />
                          {!collapsed && <span>Admin Dashboard</span>}
                        </div>
                        {!collapsed && (
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            adminOpen && "rotate-180"
                          )} />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      <SidebarMenu>
                         {visibleAdminSubItems.map((item) => {
                          const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                          return (
                            <SidebarMenuItem key={item.url}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive(item.url)}
                                tooltip={item.title}
                              >
                                <NavLink
                                  to={item.url}
                                  className={cn(
                                    "flex items-center gap-3 transition-colors",
                                    isActive(item.url)
                                      ? "text-primary bg-primary/10"
                                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                  )}
                                >
                                  <item.icon className="h-4 w-4" />
                                  {!collapsed && (
                                    <>
                                      <span>{item.title}</span>
                                      {count > 0 && (
                                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs ml-auto">
                                          {count > 99 ? '99+' : count}
                                        </Badge>
                                      )}
                                    </>
                                  )}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}

                         {/* One restricted destination contains all elevated controls. */}
                        {showSuperAdmin && (
                          <>
                            {!collapsed && (
                              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-primary/70 font-semibold">
                                Super Admin
                              </div>
                            )}
                            {superAdminSubItems.map((item) => {
                              const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                              return (
                                <SidebarMenuItem key={item.url}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={isActive(item.url)}
                                    tooltip={item.title}
                                  >
                                    <NavLink
                                      to={item.url}
                                      className={cn(
                                        "flex items-center gap-3 transition-colors",
                                        isActive(item.url)
                                          ? "text-primary bg-primary/10"
                                          : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                      )}
                                    >
                                      <item.icon className="h-4 w-4" />
                                      {!collapsed && (
                                        <>
                                          <span>{item.title}</span>
                                          {count > 0 && (
                                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs ml-auto">
                                              {count > 99 ? '99+' : count}
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                    </NavLink>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </>
                        )}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                 {/* Developer portal remains separate from Academy operations. */}
                {visibleStandaloneItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 transition-colors",
                          isActive(item.url) 
                            ? "text-primary bg-primary/10" 
                            : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="text-xs text-muted-foreground/50 text-center">
            FGN Academy
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
