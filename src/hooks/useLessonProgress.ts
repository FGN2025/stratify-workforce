import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface QuizResult {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  xpEarned: number;
  results: { id: string; correct: boolean; explanation?: string; correct_index?: number }[];
}

interface LessonRow {
  id: string;
  title: string;
  lesson_type: string;
  content: { questions?: QuizQuestion[] } | null;
  xp_reward: number;
  passing_score: number | null;
  order_index: number;
  module_id: string;
  work_order_id: string | null;
  modules: {
    id: string;
    course_id: string;
    order_index: number;
    title: string;
  };
}

interface ProgressRow {
  id: string;
  status: string;
  score: number | null;
  attempts: number;
  xp_earned: number;
  completed_at: string | null;
}

export function useLessonDetail(lessonId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['lesson-detail', lessonId, session?.access_token],
    enabled: !!lessonId && !!session?.access_token,
    queryFn: async () => {
      const { data: lesson, error } = await supabase
        .from('lessons')
        .select('id, title, lesson_type, content, xp_reward, passing_score, order_index, module_id, work_order_id, modules!inner(id, course_id, order_index, title, courses!inner(game_title))')
        .eq('id', lessonId!)
        .single();

      if (error) throw error;

      const { data: progress } = await supabase
        .from('user_lesson_progress')
        .select('id, status, score, attempts, xp_earned, completed_at')
        .eq('lesson_id', lessonId!)
        .eq('user_id', session!.user.id)
        .maybeSingle();

      return {
        lesson: lesson as unknown as LessonRow,
        progress: progress as ProgressRow | null,
      };
    },
  });
}

export function useSubmitQuiz() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      answers,
    }: {
      lessonId: string;
      answers: Record<string, number>;
    }) => {
      if (!session) throw new Error('Must be logged in');
      // Graded server-side; answers are never sent to the browser before submission.
      const { data, error } = await supabase.rpc('submit_lesson_quiz' as any, {
        p_lesson_id: lessonId,
        p_answers: answers,
      });
      if (error) throw error;
      return data as unknown as QuizResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-detail'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
  });
}

export function useNextLesson(courseId: string | undefined, currentModuleOrder: number, currentLessonOrder: number) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['next-lesson', courseId, currentModuleOrder, currentLessonOrder, session?.access_token],
    enabled: !!courseId && !!session?.access_token,
    queryFn: async () => {
      // Try next lesson in same module
      const { data: sameMod } = await supabase
        .from('lessons')
        .select('id, title, module_id, modules!inner(course_id, order_index)')
        .eq('modules.course_id', courseId!)
        .eq('modules.order_index', currentModuleOrder)
        .gt('order_index', currentLessonOrder)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (sameMod) return { lessonId: sameMod.id, title: sameMod.title };

      // Try first lesson of next module
      const { data: nextMod } = await supabase
        .from('lessons')
        .select('id, title, module_id, modules!inner(course_id, order_index)')
        .eq('modules.course_id', courseId!)
        .gt('modules.order_index', currentModuleOrder)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextMod) return { lessonId: nextMod.id, title: nextMod.title };

      return null; // No more lessons
    },
  });
}
