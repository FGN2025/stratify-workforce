import { AppLayout } from '@/components/layout/AppLayout';
import { ActiveWorkOrders } from '@/components/dashboard/ActiveWorkOrders';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';

const WorkOrders = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Work Orders</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse and manage training scenarios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Work Order
            </Button>
          </div>
        </div>

        {/* Work Orders List */}
        <ActiveWorkOrders />
      </div>
    </AppLayout>
  );
};

export default WorkOrders;
