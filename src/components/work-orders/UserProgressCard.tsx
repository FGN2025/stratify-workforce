import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, Calendar, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { XPRewardBadge } from '@/components/work-orders/XPRewardBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProgressCardProps {
  workOrderId: string;
  sourceChalllengeId?: string | null;
  status: {
    hasAttempted: boolean;
    attemptCount: number;
    bestScore?: number | null;
    isCompleted?: boolean;
    latestStatus?: string | null;
  };
}

interface LinkedCredential {
  id: string;
  title: string;
  score: number | null;
  issued_at: string;
  skills_verified: string[] | null;
  credential_type: string;
}

function useLinkedCredential(sourceChalllengeId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['linked-credential', user?.id, sourceChalllengeId],
    enabled: !!user && !!sourceChalllengeId,
    queryFn: async () => {
      if (!user || !sourceChalllengeId) return null;

      // Get user's passport first
      const { data: passport } = await supabase
        .from('skill_passport')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!passport) return null;

      const { data, error } = await supabase
        .from('skill_credentials')
        .select('id, title, score, issued_at, skills_verified, credential_type')
        .eq('passport_id', passport.id)
        .eq('external_reference_id', sourceChalllengeId)
        .order('issued_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data as LinkedCredential;
    },
  });
}

export function UserProgressCard({ workOrderId, sourceChalllengeId, status }: UserProgressCardProps) {
  const { data: credential } = useLinkedCredential(sourceChalllengeId);

  if (!status.hasAttempted) return null;

  return (
    <Card className="lg:col-span-3 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-data font-bold">{status.attemptCount}</p>
            <p className="text-xs text-muted-foreground">Attempts</p>
          </div>
          {status.bestScore !== undefined && status.bestScore !== null && (
            <div className="text-center">
              <p className="text-3xl font-data font-bold text-primary">{status.bestScore}%</p>
              <p className="text-xs text-muted-foreground">Best Score</p>
            </div>
          )}
          <div className="flex-1 min-w-[120px]">
            <Progress value={status.isCompleted ? 100 : 50} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {status.isCompleted ? 'Completed!' : 'In Progress'}
            </p>
          </div>
        </div>

        {/* Credential section */}
        {credential && (
          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Award className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{credential.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified Credential
                  </Badge>
                  {credential.score !== null && (
                    <span className="text-xs text-muted-foreground font-data">
                      Score: {credential.score}%
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(credential.issued_at).toLocaleDateString()}
                  </span>
                </div>
                {credential.skills_verified && credential.skills_verified.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {credential.skills_verified.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This credential is part of your Skill Passport and can be verified by employers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
