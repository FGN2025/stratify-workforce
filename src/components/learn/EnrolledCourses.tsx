import { CourseCard } from './CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';
import type { Course, UserCourseEnrollment } from '@/types/lms';

interface EnrolledCoursesProps {
  courses: Course[];
  enrollments: UserCourseEnrollment[];
  isLoading: boolean;
}

export function EnrolledCourses({ courses, enrollments, isLoading }: EnrolledCoursesProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-72 w-[85vw] shrink-0 rounded-lg sm:w-72 lg:w-80" />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Enrolled Courses</h3>
        <p className="text-muted-foreground">
          Browse the course catalog to find courses to enroll in.
        </p>
      </div>
    );
  }

  // Split into in-progress and completed
  const enrollmentMap = new Map(enrollments.map((e) => [e.course_id, e]));
  const inProgress = courses.filter((c) => !enrollmentMap.get(c.id)?.completed_at);
  const completed = courses.filter((c) => enrollmentMap.get(c.id)?.completed_at);

  return (
    <div className="space-y-8">
      {/* In Progress */}
      {inProgress.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">In Progress</h3>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3 scrollbar-hide">
            {inProgress.map((course) => (
              <div key={course.id} className="w-[85vw] shrink-0 snap-start sm:w-72 lg:w-80">
                <CourseCard course={{ ...course, enrolled: true }} showProgress />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Completed</h3>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3 scrollbar-hide">
            {completed.map((course) => (
              <div key={course.id} className="w-[85vw] shrink-0 snap-start sm:w-72 lg:w-80">
                <CourseCard course={{ ...course, enrolled: true, progress: 100 }} showProgress />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
