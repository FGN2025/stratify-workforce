import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  User, 
  Users, 
  Settings,
  Trophy,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
  ChevronDown,
  Link as LinkIcon,
  Briefcase,
  BookOpen,
  Target,
  Code,
  HelpCircle,
  FileCheck,
  Gamepad2,
  Box,
  Image,
  KeyRound,
  Route,
  MessageSquare,
  AppWindow,
  Webhook,
  Award,
  MessageCircle,
  Bot,
  Zap,
  Shield,
  Calendar,
  Wrench,
  Link2,
  RotateCcw,
  Activity,
  Building2,
  PackageOpen,
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
      { title: 'Platform Guide', url: '/help/guide', icon: BookOpen },
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
type AdminGroup = {
  groupKey: 'sim' | 'challenges';
  title: string;
  icon: LucideIcon;
  tier: AdminTier;
  children: AdminLeaf[];
};
type AdminEntry = AdminLeaf | AdminGroup;

const adminSubItems: AdminEntry[] = [
  // Community-scoped — tenant owners/admins can use these for their own community.
  { title: 'Community Setup', url: '/admin/community-setup', icon: Shield, tier: 'community' },
  { title: 'Events', url: '/admin/events', icon: Calendar, tier: 'community' },
  { title: 'Work Orders', url: '/admin/work-orders', icon: ClipboardList, tier: 'community' },
  { title: 'Evidence Review', url: '/admin/evidence', icon: FileCheck, badgeKey: 'evidence' as const, tier: 'community' },
  { title: 'Curation', url: '/admin/curation', icon: FileCheck, tier: 'community' },
  { title: 'Media Library', url: '/admin/media', icon: Image, tier: 'community' },
  { title: 'Registration Codes', url: '/admin/codes', icon: KeyRound, tier: 'community' },
  { title: 'Skills Paths', url: '/admin/career-paths', icon: Route, tier: 'community' },
  { title: 'Configurator', url: '/admin/configurator', icon: Wrench, tier: 'community' },

  // Platform-only.
  { title: 'Users', url: '/admin/users', icon: Users, tier: 'platform' },
  { title: 'Marketplace Catalog', url: '/admin/marketplace', icon: Target, tier: 'platform' },
  { title: 'Communities', url: '/admin/communities', icon: Building2, tier: 'platform' },
  {
    groupKey: 'sim',
    title: 'SIM',
    icon: Gamepad2,
    tier: 'platform',
    children: [
      { title: 'SIM Games', url: '/admin/games', icon: Gamepad2, tier: 'platform' },
      { title: 'SIM Categories', url: '/admin/sim-categories', icon: Box, tier: 'platform' },
      { title: 'SIM Resources', url: '/admin/sim-resources', icon: Box, tier: 'platform' },
    ],
  },
  {
    groupKey: 'challenges',
    title: 'Challenges',
    icon: FileCheck,
    tier: 'platform',
    children: [
      { title: 'Challenge Registry', url: '/admin/challenge-registry', icon: FileCheck, tier: 'platform' },
      { title: 'Challenge Mappings', url: '/admin/challenge-mappings', icon: LinkIcon, tier: 'platform' },
      { title: 'Challenge Tracks', url: '/admin/challenge-tracks', icon: Route, tier: 'platform' },
      { title: 'Activity Mapping', url: '/admin/activity-mapping', icon: LinkIcon, tier: 'platform' },
    ],
  },
  { title: 'Course Builder', url: '/admin/course-builder', icon: Wrench, tier: 'platform' },
  { title: 'Studio Submissions', url: '/admin/studio-submissions', icon: PackageOpen, tier: 'platform' },
  { title: 'Breakroom Mapper', url: '/admin/breakroom-mapper', icon: Link2, tier: 'platform' },
];

const superAdminSubItems = [
  { title: 'Community Review', url: '/admin/community-review', icon: MessageSquare, badgeKey: 'community' as const },
  { title: 'Authorized Apps', url: '/admin/authorized-apps', icon: AppWindow },
  { title: 'Webhooks', url: '/admin/webhooks', icon: Webhook },
  { title: 'Credential Types', url: '/admin/credential-types', icon: Award },
  { title: 'Discord', url: '/admin/discord', icon: MessageCircle },
  { title: 'AI Config', url: '/admin/ai-config', icon: Bot },
  { title: 'Notebook Telemetry', url: '/admin/notebook-telemetry', icon: Bot },
  { title: 'FGN Play', url: '/admin/sync-tester', icon: Zap },
  { title: 'Play Webhook Retry', url: '/admin/play-webhook-retry', icon: RotateCcw },
  { title: 'Parity Monitor', url: '/admin/parity-monitor', icon: Activity },
  { title: 'Play Games Sync', url: '/admin/play-sync', icon: Gamepad2 },
  { title: 'Super Admin', url: '/admin/super-admin', icon: Shield },
];


const standaloneAdminItems = [
  { title: 'Students', url: '/students', icon: Users, adminOnly: true },
  { title: 'Settings', url: '/settings', icon: Settings, adminOnly: true },
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
    community: pendingCommunityCount,
  };

  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  const simChildPaths = ['/admin/games', '/admin/sim-categories', '/admin/sim-resources'];
  const challengeChildPaths = ['/admin/challenge-registry', '/admin/challenge-mappings', '/admin/challenge-tracks', '/admin/activity-mapping'];
  const [simOpen, setSimOpen] = useState(simChildPaths.includes(location.pathname));
  const [challengesOpen, setChallengesOpen] = useState(challengeChildPaths.includes(location.pathname));


  const isActive = (path: string) => location.pathname === path;
  
  const isAuthenticated = Boolean(user);
  const navigationItems = isAuthenticated ? mainNavItems : publicNavItems;
  const showPlatformAdmin = isAuthenticated && !authLoading && !roleLoading && isAdmin;
  const showCommunityAdmin = isAuthenticated && !authLoading && !roleLoading && (isAdmin || isTenantAdmin);
  const showAdmin = showPlatformAdmin || showCommunityAdmin;
  const showSuperAdmin = isAuthenticated && !authLoading && !roleLoading && isSuperAdmin;
  const showDeveloper = isAuthenticated && !authLoading && !roleLoading && (isDeveloper || isAdmin);

  const visibleAdminSubItems = adminSubItems.filter((item) => {
    if (item.tier === 'platform') return showPlatformAdmin;
    return showCommunityAdmin;
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
              {showPlatformAdmin ? 'Admin' : 'Community Admin'}
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
                          if ('children' in item) {
                            const groupOpen = item.groupKey === 'sim' ? simOpen : challengesOpen;
                            const setGroupOpen = item.groupKey === 'sim' ? setSimOpen : setChallengesOpen;
                            const anyChildActive = item.children.some((c) => isActive(c.url));
                            return (
                              <Collapsible
                                key={item.groupKey}
                                open={groupOpen}
                                onOpenChange={setGroupOpen}
                              >
                                <SidebarMenuItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                      tooltip={item.title}
                                      className={cn(
                                        "w-full justify-between",
                                        anyChildActive
                                          ? "text-primary"
                                          : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4" />
                                        {!collapsed && <span>{item.title}</span>}
                                      </div>
                                      {!collapsed && (
                                        <ChevronDown className={cn(
                                          "h-4 w-4 transition-transform",
                                          groupOpen && "rotate-180"
                                        )} />
                                      )}
                                    </SidebarMenuButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="pl-4">
                                    <SidebarMenu>
                                      {item.children.map((child) => (
                                        <SidebarMenuItem key={child.url}>
                                          <SidebarMenuButton
                                            asChild
                                            isActive={isActive(child.url)}
                                            tooltip={child.title}
                                          >
                                            <NavLink
                                              to={child.url}
                                              className={cn(
                                                "flex items-center gap-3 transition-colors",
                                                isActive(child.url)
                                                  ? "text-primary bg-primary/10"
                                                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                              )}
                                            >
                                              <child.icon className="h-4 w-4" />
                                              {!collapsed && <span>{child.title}</span>}
                                            </NavLink>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                      ))}
                                    </SidebarMenu>
                                  </CollapsibleContent>
                                </SidebarMenuItem>
                              </Collapsible>
                            );
                          }
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

                        {/* Super Admin sub-items */}
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

                {/* Standalone admin items (Students, Settings, Developers) */}
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
