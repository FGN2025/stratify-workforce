import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { CourseCard } from '@/components/learn/CourseCard';
import { EnrolledCourses } from '@/components/learn/EnrolledCourses';
import { ExternalResourceCard } from '@/components/marketplace/ExternalResourceCard';
import { useCourses } from '@/hooks/useCourses';
import { useEnrollments } from '@/hooks/useEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, GraduationCap, Sparkles, Truck } from 'lucide-react';
import { ATS_RESOURCES } from '@/config/simResources';

export default function Learn() {
  const { user } = useAuth();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  const enrolledCourseIds = new Set(enrollments?.map((e) => e.course_id) || []);
  const availableCourses = courses?.filter((c) => !enrolledCourseIds.has(c.id)) || [];
  const enrolledCourses = courses?.filter((c) => enrolledCourseIds.has(c.id)) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <PageHero
          title="Learning Center"
          subtitle="Master new skills through structured courses, simulations, and hands-on training. Earn XP, unlock achievements, and build your Skill Passport."
          locationKey="learn_hero"
        />

        {/* Course Tabs */}
        <div className="container">
          <Tabs defaultValue={user ? 'my-courses' : 'catalog'} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="catalog" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Course Catalog
              </TabsTrigger>
              {user && (
                <TabsTrigger value="my-courses" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  My Courses
                </TabsTrigger>
              )}
            </TabsList>

            {/* Course Catalog */}
            <TabsContent value="catalog" className="space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {availableCourses.length} courses available
                </span>
              </div>

              {coursesLoading ? (
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-72 w-80 shrink-0 rounded-lg" />
                  ))}
                </div>
              ) : availableCourses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Courses Available</h3>
                  <p className="text-muted-foreground">
                    Check back soon for new learning opportunities.
                  </p>
                </div>
              ) : (
                <HorizontalCarousel
                  title="Available Courses"
                  subtitle={`${availableCourses.length} courses to explore`}
                  icon={<BookOpen className="h-5 w-5" />}
                >
                  {availableCourses.map((course) => (
                    <div key={course.id} className="w-80 shrink-0 snap-start">
                      <CourseCard course={course} />
                    </div>
                  ))}
                </HorizontalCarousel>
              )}
            </TabsContent>

            {/* My Courses */}
            {user && (
              <TabsContent value="my-courses">
                <EnrolledCourses
                  courses={enrolledCourses}
                  enrollments={enrollments || []}
                  isLoading={coursesLoading || enrollmentsLoading}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* External Training Resources */}
        <HorizontalCarousel
          title="External Training Resources"
          subtitle="Deep-dive curriculum for American Truck Simulator"
          icon={<Truck className="h-5 w-5" />}
        >
          <div className="w-80 shrink-0 snap-start">
            <ExternalResourceCard
              title={ATS_RESOURCES.cdlQuest.title}
              description="Access the full CDL curriculum with structured modules, telemetry labs, and certification tracking"
              href={ATS_RESOURCES.cdlQuest.href}
              icon={<GraduationCap className="h-6 w-6" />}
              ctaLabel="Access Full Curriculum"
              accentColor={ATS_RESOURCES.cdlQuest.accentColor}
            />
          </div>
        </HorizontalCarousel>
      </div>
    </AppLayout>
  );
}
