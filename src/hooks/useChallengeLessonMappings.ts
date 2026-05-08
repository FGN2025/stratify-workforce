import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChallengeLessonMappingRow {
  id: string;
  play_challenge_id: string;
  lesson_id: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChallengeLessonMappingWithJoin extends ChallengeLessonMappingRow {
  lesson_title: string | null;
  module_title: string | null;
  course_title: string | null;
  work_order_title: string | null;
}

const QK = ['challenge-lesson-mappings'];

export function useChallengeLessonMappings() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<ChallengeLessonMappingWithJoin[]> => {
      const { data, error } = await supabase
        .from('challenge_lesson_mappings')
        .select(
          `id, play_challenge_id, lesson_id, notes, is_active, created_at, updated_at,
           lessons:lesson_id ( title, modules:module_id ( title, courses:course_id ( title ) ) )`
        )
        .order('created_at', { ascending: false });
      if (error) throw error;

      const challengeIds = Array.from(new Set((data ?? []).map((r) => r.play_challenge_id)));
      let woMap = new Map<string, string>();
      if (challengeIds.length) {
        const { data: wos } = await supabase
          .from('work_orders')
          .select('title, fgn_origin_challenge_id, source_challenge_id')
          .or(
            `fgn_origin_challenge_id.in.(${challengeIds.join(',')}),source_challenge_id.in.(${challengeIds.join(',')})`
          );
        for (const w of wos ?? []) {
          const key = (w.fgn_origin_challenge_id as string | null) ?? (w.source_challenge_id as string | null);
          if (key) woMap.set(key, w.title as string);
        }
      }

      return (data ?? []).map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lesson = (r as any).lessons;
        const mod = lesson?.modules;
        const course = mod?.courses;
        return {
          id: r.id,
          play_challenge_id: r.play_challenge_id,
          lesson_id: r.lesson_id,
          notes: r.notes,
          is_active: r.is_active,
          created_at: r.created_at,
          updated_at: r.updated_at,
          lesson_title: lesson?.title ?? null,
          module_title: mod?.title ?? null,
          course_title: course?.title ?? null,
          work_order_title: woMap.get(r.play_challenge_id) ?? null,
        } satisfies ChallengeLessonMappingWithJoin;
      });
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: {
      id?: string;
      play_challenge_id: string;
      lesson_id: string;
      notes?: string | null;
      is_active?: boolean;
    }) => {
      const payload = {
        play_challenge_id: input.play_challenge_id.trim(),
        lesson_id: input.lesson_id,
        notes: input.notes ?? null,
        is_active: input.is_active ?? true,
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase
          .from('challenge_lesson_mappings')
          .update(payload)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('challenge_lesson_mappings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenge_lesson_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  return { list, upsert, remove };
}

export interface LessonOption {
  id: string;
  title: string;
  module_title: string;
  course_title: string;
}

export function useAllLessons() {
  return useQuery({
    queryKey: ['admin', 'all-lessons-flat'],
    queryFn: async (): Promise<LessonOption[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, modules:module_id ( title, courses:course_id ( title ) )')
        .order('title');
      if (error) throw error;
      return (data ?? []).map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (r as any).modules;
        return {
          id: r.id,
          title: r.title,
          module_title: mod?.title ?? '',
          course_title: mod?.courses?.title ?? '',
        };
      });
    },
  });
}

export interface ChallengeOption {
  challenge_id: string;
  work_order_title: string;
  game_title: string | null;
}

export function useChallengeOptions() {
  return useQuery({
    queryKey: ['admin', 'challenge-options'],
    queryFn: async (): Promise<ChallengeOption[]> => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('title, game_title, fgn_origin_challenge_id, source_challenge_id, is_active')
        .eq('is_active', true);
      if (error) throw error;
      const seen = new Set<string>();
      const out: ChallengeOption[] = [];
      for (const w of data ?? []) {
        const id =
          (w.fgn_origin_challenge_id as string | null) ??
          (w.source_challenge_id as string | null);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({
          challenge_id: id,
          work_order_title: w.title as string,
          game_title: (w.game_title as string | null) ?? null,
        });
      }
      return out.sort((a, b) => a.work_order_title.localeCompare(b.work_order_title));
    },
  });
}
