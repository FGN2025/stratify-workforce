
CREATE TYPE public.skill_classification AS ENUM ('transferable','domain_specific','simulation_specific','needs_review');

CREATE TABLE public.canonical_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key text NOT NULL UNIQUE,
  skill_name text NOT NULL,
  description text,
  domain text,
  classification public.skill_classification NOT NULL DEFAULT 'needs_review',
  status text NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.canonical_skills TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.canonical_skills TO authenticated;
GRANT ALL ON public.canonical_skills TO service_role;
ALTER TABLE public.canonical_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "canonical_skills_read" ON public.canonical_skills
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "canonical_skills_admin_write" ON public.canonical_skills
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER canonical_skills_updated_at BEFORE UPDATE ON public.canonical_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.skill_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_key text NOT NULL,
  game_title public.game_title,
  canonical_skill_id uuid NOT NULL REFERENCES public.canonical_skills(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'skills_taxonomy',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX skill_aliases_unique_scoped ON public.skill_aliases (alias_key, game_title) WHERE game_title IS NOT NULL;
CREATE UNIQUE INDEX skill_aliases_unique_global ON public.skill_aliases (alias_key) WHERE game_title IS NULL;
CREATE INDEX skill_aliases_canonical_idx ON public.skill_aliases (canonical_skill_id);

GRANT SELECT ON public.skill_aliases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.skill_aliases TO authenticated;
GRANT ALL ON public.skill_aliases TO service_role;
ALTER TABLE public.skill_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_aliases_read" ON public.skill_aliases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "skill_aliases_admin_write" ON public.skill_aliases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Seed canonical skills from the existing taxonomy (no key collisions exist today).
INSERT INTO public.canonical_skills (skill_key, skill_name, description, domain, classification, provenance)
SELECT st.skill_key,
       min(st.skill_name),
       min(st.description),
       CASE
         WHEN st.skill_key IN ('material_estimation','ppe_compliance','tool_maintenance') THEN 'cross_domain'
         WHEN min(st.game_title::text) = 'ATS' THEN 'transport_logistics'
         WHEN min(st.game_title::text) = 'Fiber_Tech' THEN 'telecom_fiber'
         WHEN min(st.game_title::text) = 'House_Flipper_2' THEN 'finishing_trades'
         ELSE 'unassigned'
       END,
       CASE
         WHEN st.skill_key IN ('material_estimation','ppe_compliance','tool_maintenance') THEN 'transferable'::public.skill_classification
         WHEN st.skill_key IN ('documentation','time_management','ladder_safety','trench_safety','vehicle_equipment','fuel_management') THEN 'needs_review'::public.skill_classification
         ELSE 'domain_specific'::public.skill_classification
       END,
       jsonb_build_object(
         'migrated_from','skills_taxonomy',
         'source_game_titles', to_jsonb(array_agg(DISTINCT st.game_title::text)),
         'migrated_at', now(),
         'phase','2C'
       )
FROM public.skills_taxonomy st
GROUP BY st.skill_key
ON CONFLICT (skill_key) DO NOTHING;

UPDATE public.canonical_skills SET review_note =
  'Name may describe a capability broader than the single trade it was authored under; confirm scope and domain before cross-game rollup.'
WHERE classification = 'needs_review';

-- One alias per historical game-scoped row, plus a game-independent alias for the bare key.
INSERT INTO public.skill_aliases (alias_key, game_title, canonical_skill_id, source, note)
SELECT st.skill_key, st.game_title, cs.id, 'skills_taxonomy',
       'Phase 2C: historical game-scoped taxonomy row resolves to this canonical skill.'
FROM public.skills_taxonomy st
JOIN public.canonical_skills cs ON cs.skill_key = st.skill_key
ON CONFLICT DO NOTHING;

INSERT INTO public.skill_aliases (alias_key, game_title, canonical_skill_id, source, note)
SELECT cs.skill_key, NULL, cs.id, 'canonical', 'Game-independent key.'
FROM public.canonical_skills cs
ON CONFLICT DO NOTHING;

-- Deterministic resolver: game-scoped alias first, then the game-independent alias.
CREATE OR REPLACE FUNCTION public.resolve_canonical_skill(p_skill_key text, p_game public.game_title DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT canonical_skill_id FROM public.skill_aliases
  WHERE alias_key = p_skill_key
    AND (game_title = p_game OR game_title IS NULL)
  ORDER BY (game_title IS NOT NULL) DESC
  LIMIT 1;
$$;

-- Read-only resolved view of every historical skill signal.
CREATE OR REPLACE VIEW public.skill_signals_canonical
WITH (security_invoker = true) AS
SELECT s.*,
       cs.id   AS canonical_skill_id,
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
LEFT JOIN public.skill_aliases a
       ON a.alias_key = s.skill_key
      AND (a.game_title = wo.game_title OR a.game_title IS NULL)
LEFT JOIN public.canonical_skills cs ON cs.id = a.canonical_skill_id;

GRANT SELECT ON public.skill_signals_canonical TO authenticated;

-- Mappings gain an optional canonical pointer; game-scoped skill_key stays authoritative for history.
ALTER TABLE public.task_skill_mappings
  ADD COLUMN IF NOT EXISTS canonical_skill_id uuid REFERENCES public.canonical_skills(id);

UPDATE public.task_skill_mappings m
   SET canonical_skill_id = cs.id
  FROM public.canonical_skills cs
 WHERE cs.skill_key = m.skill_key AND m.canonical_skill_id IS NULL;
