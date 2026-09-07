import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserMinus, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MembershipReviewQueue } from '@/components/communities/MembershipReviewQueue';
import { MEMBERSHIP_ROLE_LABELS, type MembershipRole } from '@/types/tenant';

interface MemberRow {
  id: string;
  user_id: string;
  role: MembershipRole;
  joined_at: string;
  username: string | null;
  avatar_url: string | null;
}

export function CommunityMembersPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['community-members', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('community_memberships')
        .select('id, user_id, role, joined_at')
        .eq('tenant_id', tenantId)
        .eq('request_status', 'approved')
        .order('joined_at', { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) return [];

      const { data: profiles } = await supabase.rpc('get_public_profile_data', {
        profile_ids: rows.map((r) => r.user_id),
      });
      const profileMap = new Map(
        (profiles ?? []).map((p: { id: string; username: string | null; avatar_url: string | null }) => [p.id, p]),
      );

      return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role as MembershipRole,
        joined_at: r.joined_at,
        username: profileMap.get(r.user_id)?.username ?? null,
        avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: MembershipRole }) => {
      const { error } = await supabase
        .from('community_memberships')
        .update({ role: role as never })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-members', tenantId] });
      toast({ title: 'Role updated' });
    },
    onError: (e: Error) =>
      toast({ title: 'Could not update role', description: e.message, variant: 'destructive' }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('community_memberships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-members', tenantId] });
      toast({ title: 'Member removed' });
    },
    onError: (e: Error) =>
      toast({ title: 'Could not remove member', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <MembershipReviewQueue tenantId={tenantId} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Members
          </CardTitle>
          <CardDescription>
            Everyone approved in this community. Change someone's role or remove them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(m.username ?? 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.username ?? 'Unnamed member'}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onValueChange={(role) =>
                        updateRole.mutate({ id: m.id, role: role as MembershipRole })
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(MEMBERSHIP_ROLE_LABELS) as MembershipRole[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {MEMBERSHIP_ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember.mutate(m.id)}
                      aria-label="Remove member"
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
