import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChallengesTab } from '@/components/admin/ChallengesTab';
import { BreakroomUsersTab } from '@/components/admin/BreakroomUsersTab';

export default function ChallengeRegistry() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Challenge Registry</h1>
          <p className="text-muted-foreground mt-1">
            Manage cross-platform challenge mappings and Breakroom identity links
          </p>
        </div>

        <Tabs defaultValue="challenges" className="w-full">
          <TabsList>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="breakroom-users">Breakroom Users</TabsTrigger>
          </TabsList>
          <TabsContent value="challenges">
            <ChallengesTab />
          </TabsContent>
          <TabsContent value="breakroom-users">
            <BreakroomUsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
