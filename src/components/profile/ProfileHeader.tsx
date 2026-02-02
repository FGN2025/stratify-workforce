import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  Calendar, 
  Clock, 
  Shield, 
  TrendingUp
} from 'lucide-react';
import type { ProfileData, SkillCredential } from '@/hooks/useProfile';

interface ProfileHeaderProps {
  profile: ProfileData;
  credentials: SkillCredential[];
  stats: { totalHours: number; totalXp: number };
  tenantName?: string;
}

export function ProfileHeader({ profile, credentials, stats, tenantName }: ProfileHeaderProps) {
  const initials = profile.username
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <Avatar className="h-24 w-24 border-4 border-primary/30 glow-primary">
          <AvatarImage src={profile.avatar_url || ''} />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">{profile.username || 'Anonymous'}</h2>
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
              <Shield className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {tenantName || 'FGN Academy'} • Professional Operator
          </p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {credentials.slice(0, 3).map(cert => (
              <Badge key={cert.id} variant="secondary" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                {cert.title}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1">
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Employability Score
            </p>
            <p className="font-data text-4xl font-bold text-primary glow-sm">
              {profile.employability_score?.toFixed(1) || '50.0'}
            </p>
          </div>
          <div className="flex items-center gap-1 text-primary text-xs">
            <TrendingUp className="h-3 w-3" />
            <span>Active learner</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Total Hours</span>
          </div>
          <p className="font-data text-xl font-semibold">{stats.totalHours}h</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Member Since</span>
          </div>
          <p className="font-data text-xl font-semibold">
            {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
            <Award className="h-4 w-4" />
            <span className="text-xs">Certifications</span>
          </div>
          <p className="font-data text-xl font-semibold">{credentials.length}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
            <Shield className="h-4 w-4" />
            <span className="text-xs">Total XP</span>
          </div>
          <p className="font-data text-xl font-semibold text-primary">{stats.totalXp}</p>
        </div>
      </div>
    </div>
  );
}
