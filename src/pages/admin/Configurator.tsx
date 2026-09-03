import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Layers, ClipboardList, Wrench, Plug } from 'lucide-react';
import { CommunitiesAdminTable } from '@/components/admin/CommunitiesAdminTable';
import { SimCategoriesManager } from '@/components/admin/SimCategoriesManager';
import { WorkOrdersManager } from '@/components/admin/WorkOrdersManager';

const TABS = ['communities', 'categories', 'work-orders'] as const;
type TabKey = (typeof TABS)[number];

/** MCP tools that write the same records this page edits. */
const MCP_TOOLS: Record<TabKey, string[]> = {
  communities: ['list_tenants', 'create_community', 'update_community'],
  categories: ['list_sim_categories', 'upsert_sim_category'],
  'work-orders': ['list_challenges', 'get_challenge', 'upsert_work_order'],
};

export default function Configurator() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as TabKey | null;
  const tab: TabKey = raw && (TABS as readonly string[]).includes(raw) ? raw : 'communities';

  const setTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  return (
    <AppLayout>
      <div className="container py-6 sm:py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                Configurator
              </h1>
              <p className="text-sm text-muted-foreground">
                One workspace for communities, industry categories, and work orders.
              </p>
            </div>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="communities" className="gap-2">
              <Building2 className="h-4 w-4" /> Communities
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Layers className="h-4 w-4" /> Categories
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Work Orders
            </TabsTrigger>
          </TabsList>

          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" /> Agent parity
              </CardTitle>
              <CardDescription className="text-xs">
                The same records can be read and written by connected AI agents through these MCP
                tools. Agent calls run as the signed-in user under the same access rules as this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {MCP_TOOLS[tab].map((name) => (
                <Badge key={name} variant="secondary" className="font-mono text-[10px]">
                  {name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <TabsContent value="communities">
            <CommunitiesAdminTable />
          </TabsContent>
          <TabsContent value="categories">
            <SimCategoriesManager />
          </TabsContent>
          <TabsContent value="work-orders">
            <WorkOrdersManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
