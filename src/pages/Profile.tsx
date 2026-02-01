import { AppLayout } from '@/components/layout/AppLayout';
import { SkillRadar } from '@/components/profile/SkillRadar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { 
  Award, 
  Calendar, 
  Clock, 
  Shield, 
  TrendingUp,
  Download,
  Share2
} from 'lucide-react';
import type { SkillSet } from '@/types/tenant';

// Mock data for profile
const mockProfile = {
  username: 'Marcus Johnson',
  avatar_url: null,
  employability_score: 78.5,
  skills: {
    safety: 85,
    efficiency: 72,
    precision: 68,
    speed: 82,
    equipment_care: 75,
  } as SkillSet,
  joined_at: '2024-08-15',
  total_hours: 142.8,
  certifications: ['CDL Class A', 'Hazmat Endorsement', 'Safety Excellence'],
};

const tenantAverage: SkillSet = {
  safety: 70,
  efficiency: 65,
  precision: 60,
  speed: 68,
  equipment_care: 62,
};

const Profile = () => {
  const { tenant } = useTenant();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Skill Passport</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your verified credentials and competency profile
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <Avatar className="h-24 w-24 border-4 border-primary/30 glow-primary">
              <AvatarImage src={mockProfile.avatar_url || ''} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {mockProfile.username.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold">{mockProfile.username}</h2>
                <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {tenant?.name} • Professional Operator
              </p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {mockProfile.certifications.map(cert => (
                  <Badge key={cert} variant="secondary" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    {cert}
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
                  {mockProfile.employability_score}
                </p>
              </div>
              <div className="flex items-center gap-1 text-emerald-500 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>+4.2% this month</span>
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
              <p className="font-data text-xl font-semibold">{mockProfile.total_hours}h</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Member Since</span>
              </div>
              <p className="font-data text-xl font-semibold">
                {new Date(mockProfile.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Award className="h-4 w-4" />
                <span className="text-xs">Certifications</span>
              </div>
              <p className="font-data text-xl font-semibold">{mockProfile.certifications.length}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Shield className="h-4 w-4" />
                <span className="text-xs">Safety Rating</span>
              </div>
              <p className="font-data text-xl font-semibold text-emerald-500">A+</p>
            </div>
          </div>
        </div>

        {/* Skill Radar */}
        <SkillRadar skills={mockProfile.skills} tenantAverage={tenantAverage} />
      </div>
    </AppLayout>
  );
};

export default Profile;
