
CREATE OR REPLACE VIEW public.skill_signals_canonical
WITH (security_invoker = true) AS
SELECT s.*,
       cs.id AS canonical_skill_id,
       cs.skill_key AS canonical_skill_key,
       cs.skill_name AS canonical_skill_name,
       cs.domain AS canonical_domain,
       cs.classification AS canonical_classification,
       wo.game_title AS observed_in_game,
       wo.id AS work_order_id,
       wo.simulation_activity_id
FROM public.skill_signals s
JOIN public.task_skill_mappings m ON m.id = s.task_skill_mapping_id
JOIN public.work_order_tasks t ON t.id = m.task_id
JOIN public.work_orders wo ON wo.id = t.work_order_id
LEFT JOIN LATERAL (
  SELECT a.canonical_skill_id
  FROM public.skill_aliases a
  WHERE a.alias_key = s.skill_key
    AND (a.game_title = wo.game_title OR a.game_title IS NULL)
  ORDER BY (a.game_title IS NOT NULL) DESC
  LIMIT 1
) al ON true
LEFT JOIN public.canonical_skills cs ON cs.id = al.canonical_skill_id;

GRANT SELECT ON public.skill_signals_canonical TO authenticated;
