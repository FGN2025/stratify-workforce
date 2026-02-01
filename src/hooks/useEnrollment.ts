import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserCourseEnrollment, DifficultyLevel } from '@/types/lms';

// Fetch user's enrollments
export function useEnrollments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['enrollments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_course_enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((enrollment) => ({
        id: enrollment.id,
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        current_module_id: enrollment.current_module_id,
        current_lesson_id: enrollment.current_lesson_id,
        course: enrollment.course ? {
          id: enrollment.course.id,
          tenant_id: enrollment.course.tenant_id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          cover_image_url: enrollment.course.cover_image_url,
          difficulty_level: enrollment.course.difficulty_level as DifficultyLevel,
          estimated_hours: enrollment.course.estimated_hours ?? 0,
          xp_reward: enrollment.course.xp_reward,
          is_published: enrollment.course.is_published ?? false,
          created_at: enrollment.course.created_at,
          updated_at: enrollment.course.updated_at,
        } : undefined,
      })) as UserCourseEnrollment[];
    },
  });
}

// Check if user is enrolled in a specific course
export function useIsEnrolled(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['enrollment', courseId, user?.id],
    enabled: !!user && !!courseId,
    queryFn: async () => {
      if (!user || !courseId) return false;

      const { data, error } = await supabase
        .from('user_course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}

// Enroll in a course
export function useEnroll() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in to enroll');

      const { data, error } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['courses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId, user?.id] });
    },
  });
}

// Update enrollment progress (current module/lesson)
export function useUpdateEnrollmentProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      lessonId,
    }: {
      courseId: string;
      moduleId: string | null;
      lessonId: string | null;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('user_course_enrollments')
        .update({
          current_module_id: moduleId,
          current_lesson_id: lessonId,
        })
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId, user?.id] });
    },
  });
}

// Mark course as completed
export function useCompleteCourse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('user_course_enrollments')
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId, user?.id] });
    },
  });
}

// Get enrollment stats for admin
export function useEnrollmentStats() {
  return useQuery({
    queryKey: ['enrollment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_course_enrollments')
        .select('course_id, completed_at');

      if (error) throw error;

      const stats = {
        totalEnrollments: data?.length || 0,
        completedCourses: data?.filter((e) => e.completed_at).length || 0,
        courseEnrollments: {} as Record<string, { enrolled: number; completed: number }>,
      };

      data?.forEach((enrollment) => {
        if (!stats.courseEnrollments[enrollment.course_id]) {
          stats.courseEnrollments[enrollment.course_id] = { enrolled: 0, completed: 0 };
        }
        stats.courseEnrollments[enrollment.course_id].enrolled++;
        if (enrollment.completed_at) {
          stats.courseEnrollments[enrollment.course_id].completed++;
        }
      });

      return stats;
    },
  });
}
