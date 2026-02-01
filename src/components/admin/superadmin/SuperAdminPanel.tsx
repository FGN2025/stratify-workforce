import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Building2, ShieldCheck, ScrollText, AlertTriangle } from 'lucide-react';
import { TenantManagement } from './TenantManagement';
import { RoleEscalationControls } from './RoleEscalationControls';
import { SystemAuditLogs } from './SystemAuditLogs';
import { DangerousOperations } from './DangerousOperations';

export function SuperAdminPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
        <Crown className="h-6 w-6 text-amber-400" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Super Admin Controls</h2>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Elevated Privileges
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Platform-wide management capabilities exclusive to super administrators
          </p>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tenants" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2 text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <TenantManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <RoleEscalationControls />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <SystemAuditLogs />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/30">
            <CardContent className="pt-6">
              <DangerousOperations />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
