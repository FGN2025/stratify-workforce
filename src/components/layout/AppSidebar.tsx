import { useState, useMemo } from 'react';
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
  ExternalLink,
  Clock,
  Link as LinkIcon,
  Briefcase,
  BookOpen,
  Video,
  FileText,
  Map as MapIcon,
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
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useSimResources } from '@/hooks/useSimResources';
import { useGameChannels } from '@/hooks/useGameChannels';
import { usePendingEvidenceCount } from '@/hooks/usePendingEvidenceCount';
import { usePendingCommunityCount } from '@/hooks/usePendingCommunityCount';
import { cn } from '@/lib/utils';
import { SIM_RESOURCES, hasResources } from '@/config/simResources';
import { getIconByKey as getSimCategoryIcon } from '@/lib/sim-icons';
import { useSimCategories } from '@/hooks/useSimCategories';
import type { GameTitle } from '@/types/tenant';

import type { LucideIcon } from 'lucide-react';

const mainNavItems = [
  { title: 'Discover', url: '/', icon: LayoutDashboard },
  { title: 'Learn', url: '/learn', icon: GraduationCap },
  { title: 'Events', url: '/events', icon: CalendarDays },
  { title: 'Work Orders', url: '/work-orders', icon: ClipboardList },
  { title: 'Communities', url: '/communities', icon: Users },
  { title: 'Skill Passport', url: '/profile', icon: User },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Careers', url: '/careers', icon: Target },
  { title: 'Help', url: '/help/student', icon: HelpCircle },
  { title: 'Platform Guide', url: '/help/guide', icon: BookOpen },
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

  // Platform-only.
  { title: 'Users', url: '/admin/users', icon: Users, tier: 'platform' },
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
    ],
  },
  { title: 'Course Builder', url: '/admin/course-builder', icon: Wrench, tier: 'platform' },
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

// Static preferred ordering for the original sims. Any additional game_channels
// rows (e.g. House Flipper, future imports) are appended automatically.
const BASE_GAME_ORDER: GameTitle[] = ['ATS', 'Fiber_Tech', 'Roadcraft', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim', 'MSFS_2024'];

// Icon mapping for database resources
const ICON_MAP: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'link': LinkIcon,
  'book-open': BookOpen,
  'video': Video,
  'file-text': FileText,
  'map': MapIcon,
  'target': Target,
  'users': Users,
  'trophy': Trophy,
};

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { tenant } = useTenant();
  const { isLoading: authLoading } = useAuth();
  const { isAdmin, isDeveloper, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { isTenantAdmin } = useTenantAdminGuard();
  
  // Fetch database resources
  const { data: dbResources } = useSimResources();
  const { data: gameChannels = [] } = useGameChannels();
  const { data: simCategories = [] } = useSimCategories();

  // Sidebar SIM CATEGORIES order: static base first, then any extra game_channels
  // (e.g. House Flipper, future imports) appended so new games auto-appear.
  const GAME_ORDER = useMemo<GameTitle[]>(() => {
    const order = [...BASE_GAME_ORDER];
    const seen = new Set<GameTitle>(order);
    for (const ch of gameChannels) {
      if (!seen.has(ch.game_title)) {
        order.push(ch.game_title);
        seen.add(ch.game_title);
      }
    }
    return order;
  }, [gameChannels]);

  // Build sidebar sections from sim_categories (admin-controlled mapping),
  // then append any games not covered by a visible category as a fallback so
  // newly added games still surface in the sidebar.
  type SidebarSection = {
    id: string;
    label: string;
    iconKey: string | null;
    color: string;
    games: GameTitle[];
  };
  const sidebarSections = useMemo<SidebarSection[]>(() => {
    const sections: SidebarSection[] = [];
    const coveredGames = new Set<GameTitle>();
    for (const cat of simCategories) {
      if (!cat.show_in_sidebar) {
        cat.default_game_titles.forEach((g) => coveredGames.add(g));
        continue;
      }
      sections.push({
        id: `cat:${cat.key}`,
        label: cat.sidebar_label || cat.title,
        iconKey: cat.icon_key,
        color: cat.accent_color,
        games: cat.default_game_titles.filter((g) => GAME_ORDER.includes(g)),
      });
      cat.default_game_titles.forEach((g) => coveredGames.add(g));
    }
    for (const game of GAME_ORDER) {
      if (coveredGames.has(game)) continue;
      const res = SIM_RESOURCES[game];
      if (!res) continue;
      sections.push({
        id: `game:${game}`,
        label: res.title,
        iconKey: null,
        color: res.accentColor,
        games: [game],
      });
    }
    return sections;
  }, [simCategories, GAME_ORDER]);

  // Pending counts for badges
  const { data: pendingEvidenceCount = 0 } = usePendingEvidenceCount();
  const { data: pendingCommunityCount = 0 } = usePendingCommunityCount();

  const badgeCounts: Record<string, number> = {
    evidence: pendingEvidenceCount,
    community: pendingCommunityCount,
  };

  // Track open state for each sidebar section (keyed by section id).
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));


  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  const simChildPaths = ['/admin/games', '/admin/sim-categories', '/admin/sim-resources'];
  const challengeChildPaths = ['/admin/challenge-registry', '/admin/challenge-mappings', '/admin/challenge-tracks'];
  const [simOpen, setSimOpen] = useState(simChildPaths.includes(location.pathname));
  const [challengesOpen, setChallengesOpen] = useState(challengeChildPaths.includes(location.pathname));


  const isActive = (path: string) => location.pathname === path;
  
  // Show admin items while loading (optimistic) to prevent race condition
  const isLoadingAuth = authLoading || roleLoading;
  const showAdmin = isLoadingAuth || isAdmin;
  const showSuperAdmin = isLoadingAuth || isSuperAdmin;
  const showDeveloper = isLoadingAuth || isDeveloper || isAdmin;

  const visibleStandaloneItems = standaloneAdminItems.filter((item) => {
    if ('adminOnly' in item && item.adminOnly) return showAdmin;
    if ('developerOnly' in item && (item as any).developerOnly) return showDeveloper;
    return true;
  });

  // Group database resources by game, fall back to static config
  const resourcesByGame = useMemo(() => {
    if (dbResources && dbResources.length > 0) {
      const grouped: Record<GameTitle, typeof dbResources> = {
        ATS: [],
        Farming_Sim: [],
        Construction_Sim: [],
        Mechanic_Sim: [],
        Fiber_Tech: [],
        Roadcraft: [],
        MSFS_2024: [],
        House_Flipper: [],
        House_Flipper_2: [],
        Electrician_Sim: [],
      };
      dbResources.forEach((r) => {
        if (grouped[r.game_title]) {
          grouped[r.game_title].push(r);
        }
      });
      return grouped;
    }
    return null;
  }, [dbResources]);

  const getResourceIcon = (iconName: string): LucideIcon => {
    return ICON_MAP[iconName] || LinkIcon;
  };

  const appName = tenant?.nav_app_name || tenant?.name || 'FGN Academy';
  const logoSrc = tenant?.logo_url || '/fgn-logo.png';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-0 h-16">
        <div className={cn(
          "flex items-center justify-center h-full w-full overflow-hidden",
        )}>
          <img
            src={logoSrc}
            alt={appName}
            className={cn("object-contain", collapsed ? "h-9 w-9" : "h-full w-auto max-w-full")}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-dark">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
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

        {/* Sim Categories */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
            Sim Categories
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarSections.map((section) => {
                const SectionIcon = section.iconKey ? getSimCategoryIcon(section.iconKey) : Target;
                const sectionOpen = !!openSections[section.id];
                const sectionHasContent = section.games.length > 0;
                const sectionActive = section.games.some((g) => location.pathname === `/sim/${g}`);

                return (
                  <Collapsible
                    key={section.id}
                    open={sectionOpen}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={section.label}
                          className={cn(
                            'w-full justify-between text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent',
                            !sectionHasContent && 'opacity-60',
                            sectionActive && 'text-primary bg-primary/10'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <SectionIcon className="h-4 w-4" style={{ color: section.color }} />
                            {!collapsed && <span>{section.label}</span>}
                          </div>
                          {!collapsed && (
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', sectionOpen && 'rotate-180')}
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        <SidebarMenu>
                          {!sectionHasContent && (
                            <SidebarMenuItem>
                              <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {!collapsed && <span>No games mapped</span>}
                              </div>
                            </SidebarMenuItem>
                          )}
                          {section.games.map((gameKey) => {
                            const game = SIM_RESOURCES[gameKey];
                            const gameResources = resourcesByGame?.[gameKey] || null;
                            const hasDbResources = !!gameResources && gameResources.length > 0;
                            const hasStaticResources = hasResources(gameKey);
                            const multiGame = section.games.length > 1;
                            const hubLabel = multiGame
                              ? (game?.shortTitle || game?.title || gameKey)
                              : 'Industry Hub';
                            const hubIconColor = game?.accentColor || section.color;

                            return (
                              <div key={gameKey}>
                                <SidebarMenuItem key={`${gameKey}-industry`}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={location.pathname === `/sim/${gameKey}`}
                                    tooltip={`${game?.title || gameKey} Industry Hub`}
                                    className={cn(
                                      'transition-colors',
                                      location.pathname === `/sim/${gameKey}`
                                        ? 'text-primary bg-primary/10'
                                        : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                                    )}
                                  >
                                    <NavLink to={`/sim/${gameKey}`} className="flex items-center gap-3">
                                      <Target className="h-4 w-4" style={{ color: hubIconColor }} />
                                      {!collapsed && <span>{hubLabel}</span>}
                                    </NavLink>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                                {hasDbResources
                                  ? gameResources!.map((resource) => {
                                      const ResourceIcon = getResourceIcon(resource.icon_name);
                                      return (
                                        <SidebarMenuItem key={resource.id}>
                                          <SidebarMenuButton
                                            asChild
                                            tooltip={resource.title}
                                            className="text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                          >
                                            <a
                                              href={resource.href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-3"
                                            >
                                              <ResourceIcon
                                                className="h-4 w-4"
                                                style={{ color: resource.accent_color }}
                                              />
                                              {!collapsed && (
                                                <>
                                                  <span>{resource.title}</span>
                                                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                                                </>
                                              )}
                                            </a>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                      );
                                    })
                                  : hasStaticResources && game
                                    ? game.resources.map((resource) => {
                                        const ResourceIcon = resource.icon;
                                        return (
                                          <SidebarMenuItem key={resource.key}>
                                            <SidebarMenuButton
                                              asChild
                                              tooltip={resource.title}
                                              className="text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                            >
                                              <a
                                                href={resource.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3"
                                              >
                                                <ResourceIcon
                                                  className="h-4 w-4"
                                                  style={{ color: resource.accentColor }}
                                                />
                                                {!collapsed && (
                                                  <>
                                                    <span>{resource.title}</span>
                                                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                                                  </>
                                                )}
                                              </a>
                                            </SidebarMenuButton>
                                          </SidebarMenuItem>
                                        );
                                      })
                                    : null}
                              </div>
                            );
                          })}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Admin Section */}
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
              Admin
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
                        {adminSubItems.map((item) => {
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
            v1.0.0 • Industrial LMS
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
