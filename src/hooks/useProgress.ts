import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserLessonProgress, ProgressStatus } from '@/types/lms';

// Fetch progress for a specific lesson
export function useLessonProgress(lessonId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lesson-progress', lessonId, user?.id],
    enabled: !!user && !!lessonId,
    queryFn: async () => {
      if (!user || !lessonId) return null;

      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) throw error;
      return data as UserLessonProgress | null;
    },
  });
}

// Fetch all progress for a course
export function useCourseProgress(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['course-progress', courseId, user?.id],
    enabled: !!user && !!courseId,
    queryFn: async () => {
      if (!user || !courseId) return [];

      // Get all lessons in the course via modules
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);

      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map((m) => m.id);

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds);

      if (!lessons || lessons.length === 0) return [];

      const lessonIds = lessons.map((l) => l.id);

      const { data: progress, error } = await supabase
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return (progress || []) as UserLessonProgress[];
    },
  });
}

// Start a lesson (create progress record)
export function useStartLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Check if progress already exists
      const { data: existing } = await supabase
        .from('user_lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        // Update to in_progress if not started
        const { data, error } = await supabase
          .from('user_lesson_progress')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            attempts: supabase.rpc ? 1 : 1, // Increment would need RPC
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new progress
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          attempts: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress', lessonId, user?.id] });
    },
  });
}

// Complete a lesson
export function useCompleteLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      score,
      xpEarned,
    }: {
      lessonId: string;
      score?: number;
      xpEarned: number;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Upsert progress
      const { data: existing } = await supabase
        .from('user_lesson_progress')
        .select('id, attempts')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      const progressData = {
        status: 'completed' as ProgressStatus,
        score: score ?? null,
        completed_at: new Date().toISOString(),
        xp_earned: xpEarned,
      };

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('user_lesson_progress')
          .update(progressData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('user_lesson_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            ...progressData,
            started_at: new Date().toISOString(),
            attempts: 1,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Award XP points
      if (xpEarned > 0) {
        await supabase.from('user_points').insert({
          user_id: user.id,
          points_type: 'xp',
          amount: xpEarned,
          source_type: 'lesson',
          source_id: lessonId,
          description: `Completed lesson`,
        });
      }

      return result;
    },
    onSuccess: (_, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress', lessonId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-xp', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-points', user?.id] });
    },
  });
}

// Fail a lesson (score below passing)
export function useFailLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, score }: { lessonId: string; score: number }) => {
      if (!user) throw new Error('Must be logged in');

      const { data: existing } = await supabase
        .from('user_lesson_progress')
        .select('id, attempts')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('user_lesson_progress')
          .update({
            status: 'failed',
            score,
            attempts: existing.attempts + 1,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('user_lesson_progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          status: 'failed',
          score,
          started_at: new Date().toISOString(),
          attempts: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress', lessonId, user?.id] });
    },
  });
}

// Get overall learning stats for a user
export function useLearningStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['learning-stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      // Get all completed lessons
      const { data: progress } = await supabase
        .from('user_lesson_progress')
        .select('status, xp_earned, completed_at')
        .eq('user_id', user.id);

      // Get enrollments
      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select('completed_at')
        .eq('user_id', user.id);

      const completedLessons = progress?.filter((p) => p.status === 'completed').length || 0;
      const totalXpFromLessons = progress?.reduce((sum, p) => sum + (p.xp_earned || 0), 0) || 0;
      const coursesInProgress = enrollments?.filter((e) => !e.completed_at).length || 0;
      const coursesCompleted = enrollments?.filter((e) => e.completed_at).length || 0;

      // Calculate streak (simplified - consecutive days with completed lessons)
      const completionDates = progress
        ?.filter((p) => p.completed_at)
        .map((p) => new Date(p.completed_at!).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
        .reverse();

      let streak = 0;
      if (completionDates && completionDates.length > 0) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (completionDates[0] === today || completionDates[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < completionDates.length; i++) {
            const prevDate = new Date(completionDates[i - 1]);
            const currDate = new Date(completionDates[i]);
            const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      return {
        completedLessons,
        totalXpFromLessons,
        coursesInProgress,
        coursesCompleted,
        streak,
      };
    },
  });
}
