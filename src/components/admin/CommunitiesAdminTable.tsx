import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ExternalLink, Loader2 } from 'lucide-react';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  member_count: number | null;
  approval_status: string;
  setup_completed_at: string | null;
  is_verified: boolean | null;
}

export function CommunitiesAdminTable() {
  const navigate = useNavigate();
  const { setTenantBySlug } = useTenant();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin-all-communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, member_count, approval_status, setup_completed_at, is_verified')
        .eq('approval_status', 'approved')
        .order('name');
      if (error) throw error;
      return (data ?? []) as TenantRow[];
    },
  });

  const openAsAdmin = (t: TenantRow) => {
    if (t.slug) {
      setTenantBySlug(t.slug);
    }
    navigate('/admin/community-setup');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          All Communities
        </CardTitle>
        <CardDescription>
          Every approved community on the platform. Open one to administer its setup, branding,
          curation, members, work orders and events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading communities…
          </div>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.name}</span>
                    {t.is_verified && <Badge variant="secondary">Verified</Badge>}
                    {t.setup_completed_at ? (
                      <Badge variant="outline">Setup complete</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                        Setup pending
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    /{t.slug} · {t.member_count ?? 0} member{(t.member_count ?? 0) === 1 ? '' : 's'}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openAsAdmin(t)}>
                  Open as admin <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </div>
            ))}
            {tenants.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No approved communities yet.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
