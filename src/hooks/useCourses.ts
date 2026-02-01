import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Course, Module, Lesson, DifficultyLevel, LessonType } from '@/types/lms';

// Fetch all published courses
export function useCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['courses', user?.id],
    queryFn: async () => {
      // Fetch courses
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If user is logged in, fetch their enrollments
      let enrollments: { course_id: string }[] = [];
      if (user) {
        const { data: enrollData } = await supabase
          .from('user_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id);
        enrollments = enrollData || [];
      }

      const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));

      // Map and add enrollment status
      return (courses || []).map((course) => ({
        id: course.id,
        tenant_id: course.tenant_id,
        title: course.title,
        description: course.description,
        cover_image_url: course.cover_image_url,
        difficulty_level: course.difficulty_level as DifficultyLevel,
        estimated_hours: course.estimated_hours ?? 0,
        xp_reward: course.xp_reward,
        is_published: course.is_published ?? false,
        created_at: course.created_at,
        updated_at: course.updated_at,
        enrolled: enrolledCourseIds.has(course.id),
      })) as Course[];
    },
  });
}

// Fetch a single course with modules and lessons
export function useCourse(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['course', courseId, user?.id],
    enabled: !!courseId,
    queryFn: async () => {
      if (!courseId) return null;

      // Fetch course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch modules
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Fetch lessons for all modules
      const moduleIds = modules?.map((m) => m.id) || [];
      let lessons: Lesson[] = [];

      if (moduleIds.length > 0) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index');

        if (lessonsError) throw lessonsError;

        lessons = (lessonsData || []).map((l) => ({
          id: l.id,
          module_id: l.module_id,
          title: l.title,
          lesson_type: l.lesson_type as LessonType,
          content: (l.content as Record<string, unknown>) || {},
          work_order_id: l.work_order_id,
          duration_minutes: l.duration_minutes ?? 10,
          xp_reward: l.xp_reward,
          order_index: l.order_index,
          passing_score: l.passing_score ?? 70,
          created_at: l.created_at,
          updated_at: l.updated_at,
        }));
      }

      // Fetch user progress if logged in
      let progressMap = new Map<string, { status: string; score: number | null; xp_earned: number }>();
      if (user && lessons.length > 0) {
        const lessonIds = lessons.map((l) => l.id);
        const { data: progress } = await supabase
          .from('user_lesson_progress')
          .select('lesson_id, status, score, xp_earned')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);

        progress?.forEach((p) => {
          progressMap.set(p.lesson_id, {
            status: p.status,
            score: p.score,
            xp_earned: p.xp_earned,
          });
        });
      }

      // Check enrollment
      let enrolled = false;
      if (user) {
        const { data: enrollment } = await supabase
          .from('user_course_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();
        enrolled = !!enrollment;
      }

      // Assemble modules with lessons
      const modulesWithLessons: Module[] = (modules || []).map((m) => ({
        id: m.id,
        course_id: m.course_id,
        title: m.title,
        description: m.description,
        order_index: m.order_index,
        xp_reward: m.xp_reward,
        created_at: m.created_at,
        updated_at: m.updated_at,
        lessons: lessons
          .filter((l) => l.module_id === m.id)
          .map((l) => ({
            ...l,
            progress: progressMap.get(l.id)
              ? {
                  id: '',
                  user_id: user?.id || '',
                  lesson_id: l.id,
                  status: progressMap.get(l.id)!.status as 'not_started' | 'in_progress' | 'completed' | 'failed',
                  score: progressMap.get(l.id)!.score,
                  attempts: 0,
                  started_at: null,
                  completed_at: null,
                  xp_earned: progressMap.get(l.id)!.xp_earned,
                  created_at: '',
                  updated_at: '',
                }
              : undefined,
          })),
      }));

      // Calculate progress
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((l) => progressMap.get(l.id)?.status === 'completed').length;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        id: course.id,
        tenant_id: course.tenant_id,
        title: course.title,
        description: course.description,
        cover_image_url: course.cover_image_url,
        difficulty_level: course.difficulty_level as DifficultyLevel,
        estimated_hours: course.estimated_hours ?? 0,
        xp_reward: course.xp_reward,
        is_published: course.is_published ?? false,
        created_at: course.created_at,
        updated_at: course.updated_at,
        modules: modulesWithLessons,
        progress,
        enrolled,
      } as Course;
    },
  });
}

// Admin: Fetch all courses (including unpublished)
export function useAdminCourses() {
  return useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((course) => ({
        id: course.id,
        tenant_id: course.tenant_id,
        title: course.title,
        description: course.description,
        cover_image_url: course.cover_image_url,
        difficulty_level: course.difficulty_level as DifficultyLevel,
        estimated_hours: course.estimated_hours ?? 0,
        xp_reward: course.xp_reward,
        is_published: course.is_published ?? false,
        created_at: course.created_at,
        updated_at: course.updated_at,
      })) as Course[];
    },
  });
}

// Create a new course
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (course: Partial<Course>) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: course.title || 'Untitled Course',
          description: course.description,
          cover_image_url: course.cover_image_url,
          difficulty_level: course.difficulty_level || 'beginner',
          estimated_hours: course.estimated_hours || 0,
          xp_reward: course.xp_reward || 100,
          is_published: false,
          tenant_id: course.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });
}

// Update a course
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Course> & { id: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// Delete a course
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
