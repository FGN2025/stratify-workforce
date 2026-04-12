import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCourse } from '@/hooks/useCourses';
import { useEnrollment } from '@/hooks/useEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  PlayCircle,
  Star,
  FileText,
  HelpCircle,
  Gamepad2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LessonType } from '@/types/lms';

const DIFFICULTY_COLORS = {
  beginner: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const LESSON_ICONS: Record<LessonType, typeof BookOpen> = {
  video: PlayCircle,
  reading: FileText,
  quiz: HelpCircle,
  simulation: Gamepad2,
  work_order: Gamepad2,
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading, error } = useCourse(id);
  const { enroll, isEnrolling } = useEnrollment();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !course) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <GraduationCap className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Course not found</h2>
          <p className="text-muted-foreground">This course may not exist or you may not have access to it.</p>
          <Button variant="outline" onClick={() => navigate('/learn')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Center
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalLessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const completedLessons = course.modules?.reduce(
    (sum, m) =>
      sum + (m.lessons?.filter((l) => l.progress?.status === 'completed').length || 0),
    0
  ) || 0;

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/learn/${id}` } });
      return;
    }
    await enroll(course.id);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/learn')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning Center
        </Button>

        {/* Course header */}
        <div className="relative rounded-xl overflow-hidden">
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <GraduationCap className="h-16 w-16 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn('capitalize', DIFFICULTY_COLORS[course.difficulty_level])}
              >
                {course.difficulty_level}
              </Badge>
              {course.enrolled && <Badge className="bg-primary">Enrolled</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          </div>
        </div>

        {/* Course stats & enroll */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{course.estimated_hours}h estimated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-primary" />
                <span>{course.xp_reward} XP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>{course.modules?.length || 0} modules · {totalLessons} lessons</span>
              </div>
            </div>
            {!course.enrolled && (
              <Button onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        {course.enrolled && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Your Progress</span>
                <span className="font-medium">
                  {completedLessons}/{totalLessons} lessons · {course.progress || 0}%
                </span>
              </div>
              <Progress value={course.progress || 0} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {course.description && (
          <Card>
            <CardHeader className="pb-2">
              <h2 className="font-semibold">About this course</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Curriculum */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Curriculum</h2>
          <Accordion type="multiple" className="space-y-2">
            {course.modules?.map((module, idx) => {
              const moduleLessons = module.lessons || [];
              const moduleCompleted = moduleLessons.filter(
                (l) => l.progress?.status === 'completed'
              ).length;
              const allDone = moduleCompleted === moduleLessons.length && moduleLessons.length > 0;

              return (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 text-left">
                      <div
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold',
                          allDone
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {allDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{module.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {moduleLessons.length} lesson{moduleLessons.length !== 1 ? 's' : ''} ·{' '}
                          {module.xp_reward} XP
                          {moduleCompleted > 0 && ` · ${moduleCompleted}/${moduleLessons.length} done`}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-1 ml-11">
                      {moduleLessons.map((lesson) => {
                        const Icon = LESSON_ICONS[lesson.lesson_type] || BookOpen;
                        const isCompleted = lesson.progress?.status === 'completed';
                        return (
                          <div
                            key={lesson.id}
                            className={cn(
                              'flex items-center gap-3 py-2 px-3 rounded-md text-sm',
                              isCompleted
                                ? 'text-muted-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className={cn(isCompleted && 'line-through')}>{lesson.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                              {lesson.duration_minutes}min · {lesson.xp_reward} XP
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </AppLayout>
  );
}
