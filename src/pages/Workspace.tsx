import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CourseCard } from '@/components/learn/CourseCard';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCourses } from '@/hooks/useCourses';
import { useEnrollments } from '@/hooks/useEnrollment';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';
import { useUserXP } from '@/hooks/usePoints';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { getWorkOrderDisplayName } from '@/lib/work-order-display';

export default function Workspace() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments();
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrders('subscribed');
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useUpcomingEvents(3);
  const { data: xp, isLoading: xpLoading } = useUserXP();
  const { credentials, isLoading: profileLoading } = useProfile();

  const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.course_id));
  const activeCourses = courses.filter((course) => enrolledIds.has(course.id) && !enrollments.find((item) => item.course_id === course.id)?.completed_at);
  const completedCount = enrollments.filter((enrollment) => enrollment.completed_at).length;
  const firstName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Learner';
  const isLoading = coursesLoading || enrollmentsLoading;

  return (
    <AppLayout>
      <div className="space-y-10">
        <section className="border-b border-border pb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 font-data text-xs uppercase text-primary">My learning workspace</p>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Welcome back, {firstName}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Continue your Courses, take on Work Orders, and build your Skill Passport.
              </p>
            </div>
            <Badge variant="outline" className="w-fit gap-2 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {tenant?.name || 'Organization'}
            </Badge>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <div className="bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">Current level</p>
            {xpLoading ? <Skeleton className="mt-3 h-8 w-28" /> : <p className="mt-2 font-display text-2xl font-semibold">{xp?.name || 'Novice'}</p>}
            <Progress value={xp?.progress || 0} className="mt-4 h-1.5" />
            <p className="mt-2 font-data text-xs text-muted-foreground">{xp?.total || 0} XP</p>
          </div>
          <div className="bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">Courses</p>
            {isLoading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-2 font-display text-2xl font-semibold">{activeCourses.length} active</p>}
            <p className="mt-3 text-xs text-muted-foreground">{completedCount} completed</p>
          </div>
          <div className="bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">Skill Passport</p>
            {profileLoading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-2 font-display text-2xl font-semibold">{credentials.length} credentials</p>}
            <Button variant="link" asChild className="mt-1 h-auto p-0 text-xs">
              <Link to="/profile">View passport <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </section>

        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-72 w-80 shrink-0 rounded-lg" />)}
          </div>
        ) : activeCourses.length > 0 ? (
          <HorizontalCarousel title="Continue your Courses" subtitle="Pick up where you left off" icon={<GraduationCap className="h-5 w-5" />} viewAllLink="/learn">
            {activeCourses.map((course) => (
              <div key={course.id} className="w-[85vw] shrink-0 snap-start sm:w-72 lg:w-80">
                <CourseCard course={{ ...course, enrolled: true }} showProgress />
              </div>
            ))}
          </HorizontalCarousel>
        ) : (
          <section className="border-y border-border py-8">
            <BookOpen className="mb-3 h-7 w-7 text-primary" />
            <h2 className="font-display text-2xl font-semibold">Choose your first Course</h2>
            <p className="mt-2 text-sm text-muted-foreground">Browse the catalog and enroll when you find the right next step.</p>
            <Button asChild className="mt-5"><Link to="/learn">Browse Courses</Link></Button>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-semibold">Available Work Orders</h2></div>
                <p className="mt-1 text-sm text-muted-foreground">Practical challenges available in your organization.</p>
              </div>
              <Button variant="ghost" asChild size="sm"><Link to="/work-orders">View all</Link></Button>
            </div>
            <div className="space-y-2">
              {workOrdersLoading ? [1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />) : workOrders.length > 0 ? workOrders.slice(0, 3).map((order) => (
                <Link key={order.id} to={`/work-orders/${order.id}`} className="flex items-center justify-between gap-4 border-b border-border py-4 transition-colors hover:text-primary">
                  <div className="min-w-0"><p className="truncate font-medium">{getWorkOrderDisplayName(order)}</p><p className="mt-1 text-xs text-muted-foreground">{order.game_title.replaceAll('_', ' ')} · {order.xp_reward} XP</p></div>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              )) : <p className="border-b border-border py-6 text-sm text-muted-foreground">No Work Orders are available for your current organization.</p>}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-semibold">Coming up</h2></div>
            <div className="space-y-3">
              {eventsLoading ? [1, 2].map((item) => <Skeleton key={item} className="h-24 w-full" />) : upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                <Card key={event.id} className="rounded-lg"><CardContent className="p-4"><p className="font-medium">{event.title}</p><p className="mt-2 font-data text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(event.scheduled_start))}</p></CardContent></Card>
              )) : <div className="border-y border-border py-6"><Sparkles className="mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">No upcoming activity is scheduled.</p></div>}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}