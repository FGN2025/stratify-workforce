import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ExternalLink } from 'lucide-react';
import type { SkillCredential } from '@/hooks/useProfile';

interface CertificationCardProps {
  credential: SkillCredential;
}

export function CertificationCard({ credential }: CertificationCardProps) {
  const isExpired = credential.expires_at && new Date(credential.expires_at) < new Date();
  const isVerified = !isExpired;

  const isPlay = credential.issuer_app_slug === 'fgn-play' && !!credential.external_reference_id;
  const playUrl = isPlay
    ? `https://play.fgn.gg/challenges/${credential.external_reference_id}`
    : null;

  const meta = (credential.metadata ?? {}) as Record<string, unknown>;
  const attempt = typeof meta.attempt_number === 'number' ? meta.attempt_number : null;
  const awarded = typeof meta.awarded_points === 'number' ? meta.awarded_points : null;
  const max = typeof meta.max_points === 'number' ? meta.max_points : null;
  const tasksSynced = typeof meta.tasks_synced === 'number' ? meta.tasks_synced : null;
  const tasksTotal = typeof meta.tasks_total === 'number' ? meta.tasks_total : null;

  const playLine = isPlay
    ? [
        attempt !== null ? `Attempt ${attempt}` : null,
        awarded !== null && max !== null ? `Score ${awarded}/${max}` : null,
        tasksSynced !== null && tasksTotal !== null ? `${tasksSynced}/${tasksTotal} tasks` : null,
      ]
        .filter(Boolean)
        .join(' • ')
    : '';

  return (
    <Card className="glass-card w-full hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <Badge
            variant={isVerified ? 'default' : 'outline'}
            className={isVerified ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}
          >
            {isVerified ? 'Verified' : isExpired ? 'Expired' : 'Pending'}
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mt-3">{credential.title}</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {credential.issuer && `${credential.issuer} • `}
          Issued {new Date(credential.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {playLine && (
          <p className="text-xs text-muted-foreground/80 mt-1 font-mono">{playLine}</p>
        )}
        {playUrl && (
          <div className="mt-3 flex justify-end">
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View on Play
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
