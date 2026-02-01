import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { SkillRadar } from '@/components/profile/SkillRadar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';
import { 
  Award, 
  Calendar, 
  Clock, 
  Shield, 
  TrendingUp,
  Download,
  Share2,
  Trophy,
  Star,
  Target,
  Zap
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

const recentAchievements = [
  { id: 1, title: 'Speed Demon', description: 'Complete 10 deliveries under time limit', icon: Zap, color: 'text-amber-500' },
  { id: 2, title: 'Safety First', description: 'Zero incidents for 30 days', icon: Shield, color: 'text-emerald-500' },
  { id: 3, title: 'Top Performer', description: 'Ranked #1 in your community', icon: Trophy, color: 'text-primary' },
];

const recentCertifications = [
  { id: 1, name: 'CDL Class A', date: '2024-12-01', status: 'verified' },
  { id: 2, name: 'Hazmat Endorsement', date: '2024-11-15', status: 'verified' },
  { id: 3, name: 'Safety Excellence', date: '2024-10-20', status: 'verified' },
  { id: 4, name: 'Advanced Maneuvering', date: '2025-01-28', status: 'pending' },
];

function AchievementCard({ achievement }: { achievement: typeof recentAchievements[0] }) {
  const Icon = achievement.icon;
  return (
    <Card className="glass-card min-w-[200px] hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 ${achievement.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="font-semibold text-sm">{achievement.title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
      </CardContent>
    </Card>
  );
}

function CertificationCard({ cert }: { cert: typeof recentCertifications[0] }) {
  return (
    <Card className="glass-card min-w-[220px] hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <Badge 
            variant={cert.status === 'verified' ? 'default' : 'outline'}
            className={cert.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
          >
            {cert.status === 'verified' ? 'Verified' : 'Pending'}
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mt-3">{cert.name}</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Issued {new Date(cert.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </CardContent>
    </Card>
  );
}

const Profile = () => {
  const { tenant } = useTenant();

  return (
    <AppLayout>
      <div className="space-y-10">
        {/* Hero Section */}
        <PageHero
          title="Skill Passport"
          subtitle="Your verified credentials and competency profile. Track achievements, certifications, and career-ready metrics."
          backgroundImage="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&h=600&fit=crop"
          primaryAction={{
            label: 'Export PDF',
            icon: <Download className="h-4 w-4" />,
          }}
          secondaryAction={{
            label: 'Share',
            icon: <Share2 className="h-4 w-4" />,
          }}
          stats={[
            { value: `${mockProfile.employability_score}`, label: 'Employability Score', highlight: true },
            { value: `${mockProfile.total_hours}h`, label: 'Total Hours' },
            { value: `${mockProfile.certifications.length}`, label: 'Certifications' },
          ]}
        />

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

        {/* Recent Achievements Carousel */}
        <HorizontalCarousel
          title="Recent Achievements"
          subtitle="Milestones and accomplishments"
          icon={<Trophy className="h-5 w-5" />}
        >
          {recentAchievements.map((achievement) => (
            <div key={achievement.id} className="shrink-0 snap-start">
              <AchievementCard achievement={achievement} />
            </div>
          ))}
        </HorizontalCarousel>

        {/* Certifications Carousel */}
        <HorizontalCarousel
          title="Certifications"
          subtitle="Your verified credentials and qualifications"
          icon={<Award className="h-5 w-5" />}
        >
          {recentCertifications.map((cert) => (
            <div key={cert.id} className="shrink-0 snap-start">
              <CertificationCard cert={cert} />
            </div>
          ))}
        </HorizontalCarousel>

        {/* Skill Radar */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide">Skill Analysis</h2>
              <p className="text-sm text-muted-foreground">Your competency breakdown vs organization average</p>
            </div>
          </div>
          <SkillRadar skills={mockProfile.skills} tenantAverage={tenantAverage} />
        </section>
      </div>
    </AppLayout>
  );
};

export default Profile;
