import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TenantSwitcher } from '@/components/TenantSwitcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function TopNav() {
  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          
          <TenantSwitcher />
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search work orders, students..." 
              className="pl-10 bg-muted/50 border-border focus:border-primary"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
          </Button>

          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <Avatar className="h-8 w-8 border border-primary/30">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                OP
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">Operator</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
