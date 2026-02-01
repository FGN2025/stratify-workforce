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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgress.map((course) => (
              <CourseCard
                key={course.id}
                course={{ ...course, enrolled: true }}
                showProgress
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Completed</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completed.map((course) => (
              <CourseCard
                key={course.id}
                course={{ ...course, enrolled: true, progress: 100 }}
                showProgress
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
