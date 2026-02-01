import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { WorkOrderCard } from './WorkOrderCard';
import type { WorkOrder, GameTitle } from '@/types/tenant';
import { Loader2, ClipboardList } from 'lucide-react';

export function ActiveWorkOrders() {
  const { tenant } = useTenant();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkOrders() {
      setIsLoading(true);
      
      // Fetch work orders for current tenant OR global ones
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work orders:', error);
        setIsLoading(false);
        return;
      }

      // Filter to show tenant-specific or global work orders
      const filtered = (data || []).filter(
        wo => wo.tenant_id === null || wo.tenant_id === tenant?.id
      );

      // Transform to match our WorkOrder type
      const typedWorkOrders: WorkOrder[] = filtered.map(wo => ({
        id: wo.id,
        tenant_id: wo.tenant_id,
        title: wo.title,
        description: wo.description,
        game_title: wo.game_title as GameTitle,
        success_criteria: (wo.success_criteria as Record<string, number>) || {},
        is_active: wo.is_active ?? true,
        created_at: wo.created_at,
      }));

      setWorkOrders(typedWorkOrders);
      setIsLoading(false);
    }

    fetchWorkOrders();
  }, [tenant?.id]);

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading work orders...</span>
        </div>
      </div>
    );
  }

  if (workOrders.length === 0) {
    return (
      <div className="glass-card p-8">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ClipboardList className="h-10 w-10 opacity-50" />
          <p>No active work orders</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Active Work Orders</h2>
        <span className="text-xs text-muted-foreground font-data">
          {workOrders.length} available
        </span>
      </div>
      
      <div className="grid gap-3">
        {workOrders.map((wo, index) => (
          <div 
            key={wo.id} 
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <WorkOrderCard 
              workOrder={wo} 
              tenantColor={tenant?.brand_color}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
