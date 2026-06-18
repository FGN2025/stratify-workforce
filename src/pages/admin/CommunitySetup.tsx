import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommunitySetupWizard } from '@/components/admin/setup/CommunitySetupWizard';
import { useTenant } from '@/contexts/TenantContext';
import { useCommunitySetup } from '@/hooks/useCommunitySetup';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantAdminGuard } from '@/hooks/useTenantAdminGuard';
import { INDUSTRY_LABEL } from '@/constants/industries';
import {
  Building2,
  CheckCircle2,
  Circle,
  Calendar,
  ClipboardList,
  FileCheck,
  Image,
  KeyRound,
  Route as RouteIcon,
  Shield,
} from 'lucide-react';

const QUICK_LINKS = [
  { title: 'Curation', description: 'Pick which catalog content this community surfaces.', url: '/admin/curation', icon: FileCheck },
  { title: 'Work Orders', description: 'Author and assign tenant work orders.', url: '/admin/work-orders', icon: ClipboardList },
  { title: 'Events', description: 'Schedule community-only events.', url: '/admin/events', icon: Calendar },
  { title: 'Evidence Review', description: 'Approve member evidence submissions.', url: '/admin/evidence', icon: Shield },
  { title: 'Registration Codes', description: 'Generate invite codes for this community.', url: '/admin/codes', icon: KeyRound },
  { title: 'Media Library', description: 'Manage community-uploaded media.', url: '/admin/media', icon: Image },
  { title: 'Skills Paths', description: 'Configure career paths surfaced to members.', url: '/admin/career-paths', icon: RouteIcon },
];

export default function CommunitySetup() {
  const { tenant } = useTenant();
  const { data } = useCommunitySetup(tenant?.id);
  const { isAdmin } = useUserRole();
  const { isTenantAdmin } = useTenantAdminGuard();
  const [open, setOpen] = useState(false);
  const completed = !!data?.setup_completed_at;

  const tierLabel = isAdmin
    ? 'Platform admin view'
    : isTenantAdmin
      ? 'Community admin view'
      : null;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              {tenant?.name ?? 'Community'} Admin
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage this community's identity, corporate info, industries, and curated catalog.
            </p>
            {tierLabel && (
              <Badge variant="outline" className="mt-2">{tierLabel}</Badge>
            )}
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
              Setup Status
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

        <div>
          <h2 className="text-lg font-semibold mb-3">Manage this community</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.url}
                to={q.url}
                className="group rounded-md border border-border bg-card/40 p-4 hover:border-primary/60 hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <q.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium group-hover:text-primary">{q.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{q.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Platform tools</h2>
            <Link
              to="/admin/communities"
              className="block rounded-md border border-border bg-card/40 p-4 hover:border-primary/60 hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">All communities</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Browse every community on the platform and open one to administer it.
              </p>
            </Link>
          </div>
        )}
      </div>

      <CommunitySetupWizard open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
