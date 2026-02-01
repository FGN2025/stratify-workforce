import { AppLayout } from '@/components/layout/AppLayout';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { ActiveWorkOrders } from '@/components/dashboard/ActiveWorkOrders';
import { LiveMonitor } from '@/components/dashboard/LiveMonitor';
import { useTenant } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { tenant, isLoading } = useTenant();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Dispatcher
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>Welcome to {tenant?.name || 'FGN Academy'} Command Center</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-led status-led-online" />
            <span className="text-xs text-muted-foreground">Systems Online</span>
          </div>
        </div>

        {/* Stats Grid */}
        <StatsGrid />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Work Orders - 2 columns */}
          <div className="lg:col-span-2">
            <ActiveWorkOrders />
          </div>

          {/* Live Monitor - 1 column */}
          <div className="lg:col-span-1">
            <LiveMonitor />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
