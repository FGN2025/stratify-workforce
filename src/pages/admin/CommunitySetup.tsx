import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommunitySetupWizard } from '@/components/admin/setup/CommunitySetupWizard';
import { useTenant } from '@/contexts/TenantContext';
import { useCommunitySetup } from '@/hooks/useCommunitySetup';
import { INDUSTRY_LABEL } from '@/constants/industries';
import { Building2, CheckCircle2, Circle } from 'lucide-react';

export default function CommunitySetup() {
  const { tenant } = useTenant();
  const { data } = useCommunitySetup(tenant?.id);
  const [open, setOpen] = useState(false);
  const completed = !!data?.setup_completed_at;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Community Setup
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure {tenant?.name}'s identity, corporate info, industries, and curated catalog.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            {completed ? 'Edit setup' : 'Start setup'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              Status
            </CardTitle>
            <CardDescription>
              {completed
                ? `Setup completed ${new Date(data!.setup_completed_at!).toLocaleDateString()}.`
                : 'Setup not yet complete.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Legal name</div>
              <div className="font-medium">{data?.legal_name || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Primary contact</div>
              <div className="font-medium">
                {data?.primary_contact_name || '—'}
                {data?.primary_contact_email ? ` · ${data.primary_contact_email}` : ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Industries</div>
              <div className="flex flex-wrap gap-2">
                {(data?.industries || []).length === 0 && <span className="text-sm text-muted-foreground">None</span>}
                {(data?.industries || []).map((i) => (
                  <Badge key={i} variant="secondary">{INDUSTRY_LABEL[i] || i}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CommunitySetupWizard open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
