import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { SkillRadar } from '@/components/profile/SkillRadar';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AchievementCard } from '@/components/profile/AchievementCard';
import { CertificationCard } from '@/components/profile/CertificationCard';
import { ExternalResourceCard } from '@/components/marketplace/ExternalResourceCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { 
  Download,
  Share2,
  Trophy,
  Award,
  Target,
  BadgeCheck,
  Briefcase
} from 'lucide-react';
import type { SkillSet } from '@/types/tenant';
import { ATS_RESOURCES } from '@/config/atsResources';

const defaultSkills: SkillSet = {
  safety: 50,
  efficiency: 50,
  precision: 50,
  speed: 50,
  equipment_care: 50,
};

const tenantAverage: SkillSet = {
  safety: 70,
  efficiency: 65,
  precision: 60,
  speed: 68,
  equipment_care: 62,
};

function ProfileSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="flex gap-4">
        <Skeleton className="h-32 w-48 rounded-lg" />
        <Skeleton className="h-32 w-48 rounded-lg" />
        <Skeleton className="h-32 w-48 rounded-lg" />
      </div>
    </div>
  );
}

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { tenant } = useTenant();
  const { profile, credentials, achievements, stats, isLoading, isOwnProfile, error } = useProfile(userId);

  if (isLoading) {
    return (
      <AppLayout>
        <ProfileSkeleton />
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">This profile doesn't exist or you don't have permission to view it.</p>
        </div>
      </AppLayout>
    );
  }

  const skills = profile.skills || defaultSkills;

  return (
    <AppLayout>
      <div className="space-y-10">
        {/* Hero Section */}
        <PageHero
          title={isOwnProfile ? "Skill Passport" : `${profile.username}'s Profile`}
          subtitle={isOwnProfile 
            ? "Your verified credentials and competency profile. Track achievements, certifications, and career-ready metrics."
            : `View ${profile.username}'s verified credentials and skill profile.`
          }
          backgroundImage="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&h=600&fit=crop"
          primaryAction={isOwnProfile ? {
            label: 'Export PDF',
            icon: <Download className="h-4 w-4" />,
          } : undefined}
          secondaryAction={isOwnProfile ? {
            label: 'Share',
            icon: <Share2 className="h-4 w-4" />,
          } : undefined}
          stats={[
            { value: `${profile.employability_score?.toFixed(1) || '50.0'}`, label: 'Employability Score', highlight: true },
            { value: `${stats.totalHours}h`, label: 'Total Hours' },
            { value: `${credentials.length}`, label: 'Certifications' },
          ]}
        />

        {/* Profile Header Card */}
        <ProfileHeader 
          profile={profile} 
          credentials={credentials} 
          stats={stats}
          tenantName={tenant?.name}
        />

        {/* Recent Achievements Carousel */}
        {achievements.length > 0 && (
          <HorizontalCarousel
            title="Recent Achievements"
            subtitle="Milestones and accomplishments"
            icon={<Trophy className="h-5 w-5" />}
          >
            {achievements.map((achievement) => (
              <div key={achievement.id} className="shrink-0 snap-start">
                <AchievementCard achievement={achievement} />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Certifications Carousel */}
        {credentials.length > 0 && (
          <HorizontalCarousel
            title="Certifications"
            subtitle="Verified credentials and qualifications"
            icon={<Award className="h-5 w-5" />}
          >
            {credentials.map((credential) => (
              <div key={credential.id} className="shrink-0 snap-start">
                <CertificationCard credential={credential} />
              </div>
            ))}
          </HorizontalCarousel>
        )}

        {/* Empty states */}
        {achievements.length === 0 && credentials.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
            <p className="text-muted-foreground">
              {isOwnProfile 
                ? "Complete work orders and courses to earn achievements and certifications!"
                : "This user hasn't earned any achievements yet."
              }
            </p>
          </div>
        )}

        {/* Skill Radar */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide">Skill Analysis</h2>
              <p className="text-sm text-muted-foreground">
                {isOwnProfile ? "Your competency breakdown vs organization average" : "Competency breakdown"}
              </p>
            </div>
          </div>
          <SkillRadar skills={skills} tenantAverage={tenantAverage} />
        </section>

        {/* Credential Verification - Only show on own profile */}
        {isOwnProfile && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide">Credential Verification</h2>
                <p className="text-sm text-muted-foreground">
                  Share your verified credentials with employers
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <ExternalResourceCard
                title={ATS_RESOURCES.cdlExchange.title}
                description="Verify and share your CDL credentials with potential employers and recruiters"
                href={ATS_RESOURCES.cdlExchange.href}
                icon={<Briefcase className="h-6 w-6" />}
                ctaLabel="Verify on CDL Exchange"
                accentColor={ATS_RESOURCES.cdlExchange.accentColor}
                variant="compact"
              />
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default Profile;
