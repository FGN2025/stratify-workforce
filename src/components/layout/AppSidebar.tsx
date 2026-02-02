import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  User, 
  Users, 
  Settings,
  Gauge,
  Trophy,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Clock
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
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { SIM_RESOURCES, hasResources } from '@/config/simResources';
import type { GameTitle } from '@/types/tenant';

const mainNavItems = [
  { title: 'Discover', url: '/', icon: LayoutDashboard },
  { title: 'Learn', url: '/learn', icon: GraduationCap },
  { title: 'Events', url: '/events', icon: CalendarDays },
  { title: 'Work Orders', url: '/work-orders', icon: ClipboardList },
  { title: 'Communities', url: '/communities', icon: Users },
  { title: 'Skill Passport', url: '/profile', icon: User },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
];

const adminNavItems = [
  { title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck, adminOnly: true },
  { title: 'Students', url: '/students', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];

// Order of games in the sidebar
const GAME_ORDER: GameTitle[] = ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { tenant } = useTenant();
  const { isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  // Track open state for each game dropdown
  const [openGames, setOpenGames] = useState<Record<GameTitle, boolean>>({
    ATS: false,
    Farming_Sim: false,
    Construction_Sim: false,
    Mechanic_Sim: false,
  });

  const toggleGame = (game: GameTitle) => {
    setOpenGames(prev => ({ ...prev, [game]: !prev[game] }));
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Show admin items while loading (optimistic) to prevent race condition
  const isLoadingAuth = authLoading || roleLoading;
  const visibleAdminItems = adminNavItems.filter(
    (item) => !('adminOnly' in item && item.adminOnly) || isLoadingAuth || isAdmin
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={cn(
          "flex items-center gap-3 transition-all",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <Gauge className="h-8 w-8 text-primary" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-sidebar-background" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">FGN.academy</span>
              <span className="text-xs text-muted-foreground">{tenant?.name || 'Loading...'}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-dark">
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

        {/* Sim Resources - External Links for all simulator games */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
            Sim Resources
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GAME_ORDER.map((gameKey) => {
                const game = SIM_RESOURCES[gameKey];
                const GameIcon = game.icon;
                const gameHasResources = hasResources(gameKey);
                
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
                          {gameHasResources ? (
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleAdminItems.map((item) => (
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
