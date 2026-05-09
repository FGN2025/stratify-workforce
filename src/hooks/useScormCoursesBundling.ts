import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * v0.2 — read scorm_course_work_orders to expose bundle context
 * for a Work Order's published SCORM courses.
 *
 * Output shape per course:
 *  - course (scorm_courses row, published only)
 *  - isLead     : true iff this WO is the bundle's lead (position 0)
 *  - bundleSize : total number of WOs in the bundle (1 = single-WO course)
 *  - workOrderIds: ordered WO ids that make up the bundle
 *
 * G5 render order is applied here:
 *   1. Lead bundle(s) first (isLead === true), then
 *   2. Non-lead bundles by published_at desc.
 */

export interface ScormBundleCourseRow {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  destination: string;
  scorm_version: string;
  zip_url: string | null;
  is_published: boolean;
  published_at: string | null;
  isLead: boolean;
  bundleSize: number;
  workOrderIds: string[];
}

interface JoinRow {
  course_id: string;
  work_order_id: string;
  is_lead: boolean;
  position: number;
}

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  destination: string;
  scorm_version: string;
  zip_url: string | null;
  is_published: boolean;
  published_at: string | null;
}

export function useScormCoursesBundling(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ['scorm-bundling', workOrderId],
    enabled: !!workOrderId,
    queryFn: async (): Promise<ScormBundleCourseRow[]> => {
      // 1. Find every course that includes this WO.
      const { data: thisWoJoins, error: e1 } = await supabase
        .from('scorm_course_work_orders')
        .select('course_id, work_order_id, is_lead, position')
        .eq('work_order_id', workOrderId!);
      if (e1) throw e1;

      const courseIds = Array.from(new Set((thisWoJoins ?? []).map((r) => r.course_id)));
      if (courseIds.length === 0) return [];

      // 2. Pull the published course rows.
      const { data: courses, error: e2 } = await supabase
        .from('scorm_courses')
        .select(
          'id, title, description, cover_image_url, destination, scorm_version, zip_url, is_published, published_at'
        )
        .in('id', courseIds)
        .eq('is_published', true);
      if (e2) throw e2;

      const publishedIds = new Set((courses ?? []).map((c) => c.id));
      if (publishedIds.size === 0) return [];

      // 3. Pull every join row for those published courses (to derive bundleSize + ordered WO list).
      const { data: allJoins, error: e3 } = await supabase
        .from('scorm_course_work_orders')
        .select('course_id, work_order_id, is_lead, position')
        .in('course_id', Array.from(publishedIds))
        .order('position', { ascending: true });
      if (e3) throw e3;

      const joinsByCourse = new Map<string, JoinRow[]>();
      for (const j of (allJoins ?? []) as JoinRow[]) {
        const arr = joinsByCourse.get(j.course_id) ?? [];
        arr.push(j);
        joinsByCourse.set(j.course_id, arr);
      }

      const rows: ScormBundleCourseRow[] = (courses as CourseRow[]).map((c) => {
        const joins = joinsByCourse.get(c.id) ?? [];
        const ordered = [...joins].sort((a, b) => a.position - b.position);
        const workOrderIds = ordered.map((j) => j.work_order_id);
        const isLead =
          ordered.find((j) => j.work_order_id === workOrderId)?.is_lead ?? false;
        return {
          ...c,
          isLead,
          bundleSize: workOrderIds.length || 1,
          workOrderIds,
        };
      });

      // 4. G5 render order: lead first, then non-lead by published_at desc.
      rows.sort((a, b) => {
        if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
        const at = a.published_at ? Date.parse(a.published_at) : 0;
        const bt = b.published_at ? Date.parse(b.published_at) : 0;
        return bt - at;
      });

      return rows;
    },
  });
}
