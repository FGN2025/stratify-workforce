import { useEffect, useMemo } from 'react';
import { setCurrentGameTitle } from '@/hooks/useTutorContext';
import { useParams, NavLink, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { CourseCard } from '@/components/learn/CourseCard';
import { WorkOrderCard } from '@/components/dashboard/WorkOrderCard';
import { ExternalResourceCard } from '@/components/marketplace/ExternalResourceCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useChannelSubscriptions } from '@/hooks/useChannelSubscriptions';
import { useCareerPaths } from '@/hooks/useCareerPaths';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { useSimResources } from '@/hooks/useSimResources';
import { SIM_RESOURCES } from '@/config/simResources';
import type { GameTitle } from '@/types/tenant';
import {
  GraduationCap,
  ClipboardList,
  Award,
  Target,
  Link as LinkIcon,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const VALID_GAMES: GameTitle[] = [
  'ATS',
  'Farming_Sim',
  'Construction_Sim',
  'Mechanic_Sim',
  'Fiber_Tech',
  'Roadcraft',
];

export default function SimIndustry() {
  const { gameTitle } = useParams<{ gameTitle: string }>();
  const { user } = useAuth();
  const { subscribedGames, subscribe, unsubscribe } = useChannelSubscriptions();

  const isValid = gameTitle && VALID_GAMES.includes(gameTitle as GameTitle);
  const game = (gameTitle ?? '') as GameTitle;
  const meta = isValid ? SIM_RESOURCES[game] : null;
  const isSubscribed = subscribedGames.includes(game);

  // Channel
  const { data: channel } = useQuery({
    queryKey: ['game-channel', game],
    enabled: !!isValid,
    queryFn: async () => {
      const { data } = await supabase
        .from('game_channels')
        .select('*')
        .eq('game_title', game)
        .maybeSingle();
      return data;
    },
  });

  // Courses for this SIM
  const { data: allCourses, isLoading: coursesLoading } = useCourses();
  const courses = useMemo(
    () => (allCourses ?? []).filter((c) => c.game_title === game),
    [allCourses, game],
  );

  // Work orders
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders(
    isValid ? (game as GameTitle) : 'all',
  );

  // Career paths + readiness
  const { data: careerPathMap = {} } = useCareerPaths();
  const { data: readinessMap = {} } = useCareerReadiness();
  const { data: pathReqs = [] } = useQuery({
    queryKey: ['career-path-reqs-by-game', game],
    enabled: !!isValid,
    queryFn: async () => {
      const { data } = await supabase
        .from('career_path_requirements')
        .select('career_path_id, game_title')
        .eq('game_title', game);
      return data ?? [];
    },
  });
  const careerPathsForGame = useMemo(() => {
    const ids = new Set((pathReqs ?? []).map((r) => r.career_path_id));
    return Array.from(ids).map((id) => ({
      id,
      meta: careerPathMap[id],
      readiness: readinessMap[id],
    }));
  }, [pathReqs, careerPathMap, readinessMap]);

  // Credentials
  const { data: credentialTypes = [] } = useCredentialTypes();
  const credsForGame = useMemo(
    () => credentialTypes.filter((c) => c.game_title === game && c.is_active),
    [credentialTypes, game],
  );

  // Resources
  const { data: simResources = [] } = useSimResources();
  const resourcesForGame = useMemo(
    () => simResources.filter((r) => r.game_title === game && r.is_active),
    [simResources, game],
  );

  // Activate SIM-specific Atlas persona while on this hub
  useEffect(() => {
    if (isValid) {
      setCurrentGameTitle(game);
      return () => setCurrentGameTitle(null);
    }
  }, [isValid, game]);

  if (!isValid || !meta) {
    return <Navigate to="/work-orders" replace />;
  }

  const Icon = meta.icon;
  const accent = channel?.accent_color || meta.accentColor;
  const cover =
    channel?.cover_image_url ||
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80';

  const toggleSubscribe = () => {
    if (!user) return;
    if (isSubscribed) unsubscribe(game);
    else subscribe(game);
  };

  return (
    <AppLayout>
      <div className="space-y-10">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <div className="absolute inset-0">
            <img src={cover} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
          </div>
          <div className="relative z-10 px-8 py-12 md:py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                Industry · Simulator
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
              {channel?.name ?? meta.title}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mt-4 max-w-xl">
              {channel?.description ??
                `Train, work, and earn credentials in the ${meta.title} ecosystem.`}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6">
              {user && (
                <Button
                  size="lg"
                  variant={isSubscribed ? 'outline' : 'default'}
                  className="gap-2"
                  onClick={toggleSubscribe}
                >
                  {isSubscribed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Subscribed
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Follow Industry
                    </>
                  )}
                </Button>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="font-data">{channel?.member_count ?? 0}</span> members
                <span className="mx-2">·</span>
                <ClipboardList className="h-4 w-4" />
                <span className="font-data">{workOrders.length}</span> active work orders
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 space-y-12">
          {/* Signed-out conversion banner */}
          {!user && (
            <JoinCtaBanner message={`Join free to follow ${channel?.name ?? meta.title}, complete work orders, and earn credentials.`} />
          )}

          {/* Curriculum */}
          <HorizontalCarousel
            title="Curriculum"
            subtitle={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'} for ${meta.shortTitle}`}
            icon={<GraduationCap className="h-5 w-5" />}
            viewAllLink="/learn"
          >
            {coursesLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-72 w-[85vw] sm:w-72 lg:w-80 shrink-0 rounded-lg" />
              ))
            ) : courses.length === 0 ? (
              <EmptyState message={`First ${meta.shortTitle} course coming soon.`} />
            ) : (
              courses.map((course) => (
                <div key={course.id} className="w-[85vw] sm:w-72 lg:w-80 shrink-0 snap-start">
                  <CourseCard course={course} />
                </div>
              ))
            )}
          </HorizontalCarousel>

          {/* Work Orders */}
          <HorizontalCarousel
            title="Active Work Orders"
            subtitle="Real assignments tied to this simulator"
            icon={<ClipboardList className="h-5 w-5" />}
            viewAllLink="/work-orders"
          >
            {woLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-96 shrink-0 rounded-lg" />
              ))
            ) : workOrders.length === 0 ? (
              <EmptyState message="No active work orders for this industry yet." />
            ) : (
              workOrders.map((wo) => (
                <div key={wo.id} className="w-96 shrink-0 snap-start">
                  <WorkOrderCard workOrder={wo as never} tenantColor={accent} />
                </div>
              ))
            )}
          </HorizontalCarousel>

          {/* Career Paths */}
          {careerPathsForGame.length > 0 && (
            <HorizontalCarousel
              title="Career Paths"
              subtitle="How close you are to industry-recognized roles"
              icon={<Target className="h-5 w-5" />}
              viewAllLink="/careers"
            >
              {careerPathsForGame.map(({ id, readiness, meta: pathMeta }) => {
                const pct = readiness?.readinessPct ?? 0;
                return (
                  <NavLink
                    key={id}
                    to="/careers"
                    className="w-[85vw] sm:w-72 lg:w-80 shrink-0 snap-start glass-card p-5 hover:border-primary/50 transition-all"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" style={{ color: accent }} />
                      <h3 className="font-semibold uppercase tracking-wide text-sm">{id}</h3>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-display font-bold">{pct}%</div>
                        <div className="text-xs text-muted-foreground">readiness</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Target {pathMeta?.min_readiness_pct ?? 75}%
                      </Badge>
                    </div>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: accent }}
                      />
                    </div>
                  </NavLink>
                );
              })}
            </HorizontalCarousel>
          )}

          {/* Credentials */}
          {credsForGame.length > 0 && (
            <HorizontalCarousel
              title="Credentials You Can Earn"
              subtitle="Verifiable proof of skill in this industry"
              icon={<Award className="h-5 w-5" />}
            >
              {credsForGame.map((c) => (
                <div
                  key={c.id}
                  className="w-[85vw] sm:w-72 lg:w-80 shrink-0 snap-start glass-card p-5"
                  style={{ borderTop: `3px solid ${c.accent_color}` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="h-5 w-5" style={{ color: c.accent_color }} />
                    <h3 className="font-semibold">{c.display_name}</h3>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{c.description}</p>
                  )}
                  {c.skills_granted?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {c.skills_granted.slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {s.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </HorizontalCarousel>
          )}

          {/* External Resources */}
          {resourcesForGame.length > 0 && (
            <HorizontalCarousel
              title="External Resources"
              subtitle="Curated tools and partner sites"
              icon={<LinkIcon className="h-5 w-5" />}
            >
              {resourcesForGame.map((r) => (
                <div key={r.id} className="w-[85vw] sm:w-72 lg:w-80 shrink-0 snap-start">
                  <ExternalResourceCard
                    title={r.title}
                    description={r.description ?? ''}
                    href={r.href}
                    icon={<LinkIcon className="h-5 w-5" />}
                    ctaLabel="Open"
                    accentColor={r.accent_color}
                  />
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="w-full py-10 text-center text-sm text-muted-foreground">{message}</div>
  );
}
