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
import { useDiscordConnection } from '@/hooks/useDiscordConnection';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

interface ProfileHeaderProps {
  profile: ProfileData;
  credentials: SkillCredential[];
  stats: { totalHours: number; totalXp: number };
  tenantName?: string;
}

export function ProfileHeader({ profile, credentials, stats, tenantName }: ProfileHeaderProps) {
  const { connection } = useDiscordConnection();
  
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
            {connection && connection.isActive && (
              <Badge 
                variant="outline" 
                className="bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2]"
              >
                <DiscordIcon className="h-3 w-3 mr-1" />
                @{connection.username}
              </Badge>
            )}
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
