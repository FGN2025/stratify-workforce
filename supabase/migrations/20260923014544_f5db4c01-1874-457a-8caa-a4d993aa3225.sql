CREATE TABLE public.work_order_migration_maturity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL UNIQUE REFERENCES public.work_orders(id) ON DELETE CASCADE,
  level1_approved_at timestamptz,
  level1_approved_by uuid,
  level2_approved_at timestamptz,
  level2_approved_by uuid,
  level3_approved_at timestamptz,
  level3_approved_by uuid,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_migration_maturity TO authenticated;
GRANT ALL ON public.work_order_migration_maturity TO service_role;

ALTER TABLE public.work_order_migration_maturity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read migration maturity"
  ON public.work_order_migration_maturity FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins write migration maturity"
  ON public.work_order_migration_maturity FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_work_order_migration_maturity_updated_at
  BEFORE UPDATE ON public.work_order_migration_maturity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.work_order_migration_readiness
WITH (security_invoker = on) AS
SELECT
  w.id AS work_order_id,
  w.title,
  w.game_title::text AS game_title,
  w.simulation_activity_id,
  c.canonical_name,
  COALESCE(c.industry_domain, 'unclassified') AS industry_domain,
  w.owner_tenant_id,
  w.visibility,
  w.is_active,
  (w.simulation_activity_id IS NOT NULL) AS canonical_activity_linked,
  (w.source_challenge_id IS NULL AND w.fgn_origin_challenge_id IS NULL) AS academy_native,
  t.task_count,
  m.tasks_with_mappings,
  m.mapping_count,
  m.approved_mapping_count,
  m.mappings_with_direct_bases,
  r.requirement_count,
  r.tasks_with_requirements,
  a.criteria_count,
  a.gating_criteria_count,
  mat.level1_approved_at,
  mat.level2_approved_at,
  mat.level3_approved_at,
  CASE WHEN mat.level3_approved_at IS NOT NULL THEN 3
       WHEN mat.level2_approved_at IS NOT NULL THEN 2
       WHEN mat.level1_approved_at IS NOT NULL THEN 1
       ELSE 0 END AS approved_level,
  (w.simulation_activity_id IS NOT NULL) AS level1_eligible,
  (w.simulation_activity_id IS NOT NULL
     AND COALESCE(t.task_count,0) > 0
     AND COALESCE(m.approved_mapping_count,0) > 0
     AND COALESCE(m.tasks_with_mappings,0) = COALESCE(t.task_count,0)) AS level2_eligible,
  (w.simulation_activity_id IS NOT NULL
     AND COALESCE(t.task_count,0) > 0
     AND COALESCE(m.approved_mapping_count,0) > 0
     AND COALESCE(r.requirement_count,0) > 0
     AND COALESCE(a.gating_criteria_count,0) > 0
     AND COALESCE(m.mappings_with_direct_bases,0) = COALESCE(m.mapping_count,0)) AS level3_eligible
FROM public.work_orders w
LEFT JOIN public.simulation_activity_cache c ON c.simulation_activity_id = w.simulation_activity_id
LEFT JOIN public.work_order_migration_maturity mat ON mat.work_order_id = w.id
LEFT JOIN LATERAL (
  SELECT count(*)::int AS task_count FROM public.work_order_tasks wt WHERE wt.work_order_id = w.id
) t ON true
LEFT JOIN LATERAL (
  SELECT count(*)::int AS mapping_count,
         count(*) FILTER (WHERE tsm.approved_at IS NOT NULL)::int AS approved_mapping_count,
         count(DISTINCT tsm.task_id)::int AS tasks_with_mappings,
         count(*) FILTER (WHERE tsm.direct_evidence_bases IS NOT NULL AND array_length(tsm.direct_evidence_bases,1) > 0)::int AS mappings_with_direct_bases
  FROM public.task_skill_mappings tsm
  JOIN public.work_order_tasks wt2 ON wt2.id = tsm.task_id
  WHERE wt2.work_order_id = w.id AND tsm.is_active
) m ON true
LEFT JOIN LATERAL (
  SELECT count(*)::int AS requirement_count,
         count(DISTINCT req.task_id)::int AS tasks_with_requirements
  FROM public.work_order_task_evidence_requirements req
  JOIN public.work_order_tasks wt3 ON wt3.id = req.task_id
  WHERE wt3.work_order_id = w.id AND req.is_active
) r ON true
LEFT JOIN LATERAL (
  SELECT count(*)::int AS criteria_count,
         count(*) FILTER (WHERE ac.is_gating)::int AS gating_criteria_count
  FROM public.assessment_criteria ac
  JOIN public.work_order_task_evidence_requirements req2 ON req2.id = ac.requirement_id
  JOIN public.work_order_tasks wt4 ON wt4.id = req2.task_id
  WHERE wt4.work_order_id = w.id AND ac.is_active
) a ON true;

GRANT SELECT ON public.work_order_migration_readiness TO authenticated;
GRANT SELECT ON public.work_order_migration_readiness TO service_role;