import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight, 
  Globe, 
  Lock, 
  Key,
  FileCode,
  BookOpen,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApiSection, type ApiEndpoint, getMethodColor } from '@/lib/api-docs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApiSidebarProps {
  apis: ApiSection[];
  activeEndpoint?: string;
  onEndpointClick: (apiId: string, endpointId: string) => void;
}

export function ApiSidebar({ apis, activeEndpoint, onEndpointClick }: ApiSidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>(apis.map(a => a.id));

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="w-64 border-r border-border bg-card h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">API Reference</h2>
        <p className="text-xs text-muted-foreground mt-1">FGN.Academy APIs</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Quick Links */}
          <div className="mb-4">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Guides
            </div>
            <NavItem icon={BookOpen} label="Overview" href="#overview" />
            <NavItem icon={Key} label="Authentication" href="#authentication" />
            <NavItem icon={Zap} label="Quick Start" href="#quickstart" />
            <NavItem icon={FileCode} label="OpenAPI Specs" href="#openapi" />
          </div>

          {/* API Sections */}
          {apis.map((api) => (
            <Collapsible
              key={api.id}
              open={openSections.includes(api.id)}
              onOpenChange={() => toggleSection(api.id)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors">
                <span>{api.title}</span>
                {openSections.includes(api.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-2 border-l border-border pl-2 space-y-0.5">
                  {api.endpoints.map((endpoint) => (
                    <EndpointNavItem
                      key={endpoint.id}
                      endpoint={endpoint}
                      isActive={activeEndpoint === endpoint.id}
                      onClick={() => onEndpointClick(api.id, endpoint.id)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function NavItem({ icon: Icon, label, href }: { icon: typeof BookOpen; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

function EndpointNavItem({ 
  endpoint, 
  isActive, 
  onClick 
}: { 
  endpoint: ApiEndpoint; 
  isActive: boolean;
  onClick: () => void;
}) {
  const AuthIcon = endpoint.auth === 'none' ? Globe : endpoint.auth === 'bearer' ? Lock : Key;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg transition-colors text-left",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <span className={cn(
        "w-12 text-[10px] font-bold uppercase tracking-wide text-center py-0.5 rounded",
        getMethodColor(endpoint.method),
        "text-white"
      )}>
        {endpoint.method}
      </span>
      <span className="truncate flex-1 font-mono text-xs">
        {endpoint.path.split('/').pop()}
      </span>
      <AuthIcon className="h-3 w-3 opacity-50 flex-shrink-0" />
    </button>
  );
}
