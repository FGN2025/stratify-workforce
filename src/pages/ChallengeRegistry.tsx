import { AppLayout } from '@/components/layout/AppLayout';
import { ChallengesTab } from '@/components/admin/ChallengesTab';

export default function ChallengeRegistry() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Challenge Registry</h1>
          <p className="text-muted-foreground mt-1">
            Review legacy cross-platform challenge mappings. New challenge authoring happens in Studio.
          </p>
        </div>

        <ChallengesTab />
      </div>
    </AppLayout>
  );
}
