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
  Truck,
  ChevronDown,
  ExternalLink,
  Briefcase
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
import { ATS_RESOURCES } from '@/config/atsResources';

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

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { tenant } = useTenant();
  const { isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [atsOpen, setAtsOpen] = useState(false);

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

        {/* ATS Resources - External Links */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">
            ATS Resources
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Collapsible open={atsOpen} onOpenChange={setAtsOpen}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip="ATS Resources"
                  className="w-full justify-between text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4" />
                    {!collapsed && <span>American Truck Sim</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      atsOpen && "rotate-180"
                    )} />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="CDL Quest - Training"
                      className="text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                    >
                      <a
                        href={ATS_RESOURCES.cdlQuest.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3"
                      >
                        <GraduationCap className="h-4 w-4" style={{ color: ATS_RESOURCES.cdlQuest.accentColor }} />
                        {!collapsed && (
                          <>
                            <span>CDL Quest</span>
                            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                          </>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="CDL Exchange - Careers"
                      className="text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                    >
                      <a
                        href={ATS_RESOURCES.cdlExchange.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3"
                      >
                        <Briefcase className="h-4 w-4" style={{ color: ATS_RESOURCES.cdlExchange.accentColor }} />
                        {!collapsed && (
                          <>
                            <span>CDL Exchange</span>
                            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                          </>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
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
