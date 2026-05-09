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
  Map,
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
import { usePendingEvidenceCount } from '@/hooks/usePendingEvidenceCount';
import { usePendingCommunityCount } from '@/hooks/usePendingCommunityCount';
import { cn } from '@/lib/utils';
import { SIM_RESOURCES, hasResources } from '@/config/simResources';
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

const adminSubItems = [
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Events', url: '/admin/events', icon: Calendar },
  { title: 'Work Orders', url: '/admin/work-orders', icon: ClipboardList },
  { title: 'Evidence Review', url: '/admin/evidence', icon: FileCheck, badgeKey: 'evidence' as const },
  { title: 'SIM Games', url: '/admin/games', icon: Gamepad2 },
  { title: 'SIM Resources', url: '/admin/sim-resources', icon: Box },
  { title: 'Media Library', url: '/admin/media', icon: Image },
  { title: 'Registration Codes', url: '/admin/codes', icon: KeyRound },
  { title: 'Skills Paths', url: '/admin/career-paths', icon: Route },
  { title: 'Challenge Registry', url: '/admin/challenge-registry', icon: FileCheck },
  { title: 'Challenge Mappings', url: '/admin/challenge-mappings', icon: LinkIcon },
  { title: 'Course Builder', url: '/admin/course-builder', icon: Wrench },
  { title: 'Breakroom Mapper', url: '/admin/breakroom-mapper', icon: Link2 },
];

const superAdminSubItems = [
  { title: 'Community Review', url: '/admin/community-review', icon: MessageSquare, badgeKey: 'community' as const },
  { title: 'Authorized Apps', url: '/admin/authorized-apps', icon: AppWindow },
  { title: 'Webhooks', url: '/admin/webhooks', icon: Webhook },
  { title: 'Credential Types', url: '/admin/credential-types', icon: Award },
  { title: 'Discord', url: '/admin/discord', icon: MessageCircle },
  { title: 'AI Config', url: '/admin/ai-config', icon: Bot },
  { title: 'FGN Play', url: '/admin/sync-tester', icon: Zap },
  { title: 'Super Admin', url: '/admin/super-admin', icon: Shield },
];

const standaloneAdminItems = [
  { title: 'Students', url: '/students', icon: Users, adminOnly: true },
  { title: 'Settings', url: '/settings', icon: Settings, adminOnly: true },
  { title: 'Developers', url: '/developers', icon: Code, developerOnly: true },
];

// Order of games in the sidebar
const GAME_ORDER: GameTitle[] = ['ATS', 'Fiber_Tech', 'Roadcraft', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'];

// Icon mapping for database resources
const ICON_MAP: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'link': LinkIcon,
  'book-open': BookOpen,
  'video': Video,
  'file-text': FileText,
  'map': Map,
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
  
  // Fetch database resources
  const { data: dbResources } = useSimResources();

  // Pending counts for badges
  const { data: pendingEvidenceCount = 0 } = usePendingEvidenceCount();
  const { data: pendingCommunityCount = 0 } = usePendingCommunityCount();

  const badgeCounts: Record<string, number> = {
    evidence: pendingEvidenceCount,
    community: pendingCommunityCount,
  };
  
  // Track open state for each game dropdown
  const [openGames, setOpenGames] = useState<Record<GameTitle, boolean>>({
    ATS: false,
    Farming_Sim: false,
    Construction_Sim: false,
    Mechanic_Sim: false,
    Fiber_Tech: false,
    Roadcraft: false,
  });

  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  const toggleGame = (game: GameTitle) => {
    setOpenGames(prev => ({ ...prev, [game]: !prev[game] }));
  };

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

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-0 h-16">
        <div className={cn(
          "flex items-center justify-center h-full w-full overflow-hidden",
        )}>
          <img
            src="/fgn-logo.png"
            alt="FGN Academy"
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
              {GAME_ORDER.map((gameKey) => {
                const game = SIM_RESOURCES[gameKey];
                const GameIcon = game.icon;
                const gameResources = resourcesByGame?.[gameKey] || null;
                const hasDbResources = gameResources && gameResources.length > 0;
                const hasStaticResources = hasResources(gameKey);
                const gameHasResources = hasDbResources || hasStaticResources;
                
                return (
                  <Collapsible
                    key={gameKey}
                    open={openGames[gameKey]}
                    onOpenChange={() => toggleGame(gameKey)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={game.title}
                          className={cn(
                            "w-full justify-between text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent",
                            !gameHasResources && "opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <GameIcon 
                              className="h-4 w-4" 
                              style={{ color: game.accentColor }} 
                            />
                            {!collapsed && <span>{game.title}</span>}
                          </div>
                          {!collapsed && (
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform",
                              openGames[gameKey] && "rotate-180"
                            )} />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        <SidebarMenu>
                          {hasDbResources ? (
                            gameResources.map((resource) => {
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
                          ) : hasStaticResources ? (
                            game.resources.map((resource) => {
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
                          ) : (
                            <SidebarMenuItem>
                              <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {!collapsed && <span>Coming Soon</span>}
                              </div>
                            </SidebarMenuItem>
                          )}
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
