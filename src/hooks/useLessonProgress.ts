import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
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
      questions,
      passingScore,
      xpReward,
    }: {
      lessonId: string;
      answers: Record<string, number>;
      questions: QuizQuestion[];
      passingScore: number;
      xpReward: number;
    }) => {
      const userId = session!.user.id;
      const correct = questions.filter((q) => answers[q.id] === q.correct_index).length;
      const pct = Math.round((correct / questions.length) * 100);
      const passed = pct >= passingScore;
      const status = passed ? 'completed' : 'failed';
      const xpEarned = passed ? xpReward : 0;

      // Check existing progress
      const { data: existing } = await supabase
        .from('user_lesson_progress')
        .select('id, attempts')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_lesson_progress')
          .update({
            status: status as any,
            score: pct,
            attempts: existing.attempts + 1,
            xp_earned: xpEarned,
            completed_at: passed ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_lesson_progress')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            status: status as any,
            score: pct,
            attempts: 1,
            xp_earned: xpEarned,
            started_at: new Date().toISOString(),
            completed_at: passed ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }

      return { correct, total: questions.length, pct, passed, xpEarned };
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
