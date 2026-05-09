import { useQuery } from '@tanstack/react-query';
import { Boxes, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SpatialVerificationsProps {
  /** Profile owner being viewed. Section only renders for the owner due to RLS. */
  userId: string;
}

interface SpatialAttempt {
  id: string;
  breakroom_quiz_id: number;
  last_attempt_at: string;
  metadata: { quiz_name?: string; breakroom_course_name?: string } | null;
  fgn_result: string | null;
}

/**
 * Lists the user's recent Breakroom (spatial) verifications. The
 * `breakroom_sync_attempts` table is RLS-restricted to the owner + admins,
 * so this only renders meaningful data on the user's own profile.
 */
export function SpatialVerifications({ userId }: SpatialVerificationsProps) {
  const { user, session } = useAuth();
  const isOwner = user?.id === userId;

  const { data: attempts } = useQuery({
    queryKey: ['spatial-verifications', userId, session?.access_token],
    enabled: !!session?.access_token && isOwner,
    queryFn: async (): Promise<SpatialAttempt[]> => {
      const { data, error } = await supabase
        .from('breakroom_sync_attempts')
        .select('id, breakroom_quiz_id, last_attempt_at, metadata, fgn_result')
        .eq('fgn_user_id', userId)
        .eq('sync_outcome', 'completed')
        .order('last_attempt_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as SpatialAttempt[];
    },
  });

  if (!isOwner || !attempts || attempts.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <Boxes className="h-5 w-5 text-secondary" />
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wide">Spatial Verifications</h2>
          <p className="text-sm text-muted-foreground">
            Tasks verified in the Breakroom metaverse and synced to your Skill Passport
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {attempts.map((a) => {
          const name = a.metadata?.quiz_name || a.metadata?.breakroom_course_name || `Quiz #${a.breakroom_quiz_id}`;
          return (
            <div key={a.id} className="glass-card p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary/15 border border-secondary/30 flex items-center justify-center shrink-0">
                <Boxes className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{name}</p>
                  <Badge variant="outline" className="text-[10px] border-secondary/40 text-secondary-foreground bg-secondary/10 shrink-0">
                    Verified
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(a.last_attempt_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Synced from Breakroom
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
