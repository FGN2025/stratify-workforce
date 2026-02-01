import { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, School, Briefcase, GraduationCap, Building, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tenant, CategoryType } from '@/types/tenant';

interface TenantHierarchyTreeProps {
  tenants: Tenant[];
  onSelect?: (tenant: Tenant) => void;
  selectedId?: string;
}

const CATEGORY_ICONS: Record<CategoryType, React.ComponentType<{ className?: string }>> = {
  geography: Building2,
  broadband_provider: Building,
  trade_skill: Briefcase,
  school: School,
  employer: Briefcase,
  training_center: GraduationCap,
  government: Building2,
  nonprofit: Users,
};

interface TreeNodeProps {
  tenant: Tenant;
  level: number;
  onSelect?: (tenant: Tenant) => void;
  selectedId?: string;
}

function TreeNode({ tenant, level, onSelect, selectedId }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = tenant.children && tenant.children.length > 0;
  const Icon = tenant.category_type ? CATEGORY_ICONS[tenant.category_type] : Building2;
  const isSelected = tenant.id === selectedId;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-accent/50',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(tenant)}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <span className="w-5" />
        )}
        
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: tenant.brand_color }}
        />
        
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        
        <span className="font-medium truncate">{tenant.name}</span>
        
        {tenant.category_type && (
          <Badge variant="outline" className="ml-auto text-xs capitalize shrink-0">
            {tenant.category_type.replace('_', ' ')}
          </Badge>
        )}
        
        <span className="text-xs text-muted-foreground shrink-0">
          {tenant.member_count} members
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {tenant.children!.map((child) => (
            <TreeNode
              key={child.id}
              tenant={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TenantHierarchyTree({ tenants, onSelect, selectedId }: TenantHierarchyTreeProps) {
  if (tenants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tenants to display
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-2 bg-card">
      {tenants.map((tenant) => (
        <TreeNode
          key={tenant.id}
          tenant={tenant}
          level={0}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
