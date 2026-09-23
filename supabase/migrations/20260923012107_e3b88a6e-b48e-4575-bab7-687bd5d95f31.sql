
INSERT INTO public.signal_strength_schemes (scheme_key, description, allowed_values, is_active)
VALUES (
  'v2_fit_weighted',
  'Strength derives from evidence-to-skill fit against the task skill mapping, assessment quality, gating coverage, evidence coverage and (small) evidence diversity. Confidence is an internal evidence-strength measure, not a calibrated probability that a person possesses a real-world occupational skill.',
  ARRAY['weak','moderate','strong'],
  true
) ON CONFLICT (scheme_key) DO NOTHING;

ALTER TABLE public.task_skill_mappings
  ADD COLUMN IF NOT EXISTS direct_evidence_bases public.evidence_basis[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supporting_evidence_bases public.evidence_basis[] NOT NULL DEFAULT '{}';

UPDATE public.task_skill_mappings
   SET direct_evidence_bases = COALESCE(expected_evidence_basis, '{}')
 WHERE direct_evidence_bases = '{}';

UPDATE public.task_skill_mappings SET
  direct_evidence_bases = ARRAY['structured_result','written_reasoning']::public.evidence_basis[],
  supporting_evidence_bases = ARRAY['outcome_capture']::public.evidence_basis[]
WHERE skill_key = 'material_estimation';

UPDATE public.task_skill_mappings SET
  direct_evidence_bases = ARRAY['written_reasoning','structured_result']::public.evidence_basis[],
  supporting_evidence_bases = ARRAY['outcome_capture']::public.evidence_basis[]
WHERE skill_key = 'paint_system_selection';

UPDATE public.task_skill_mappings SET
  direct_evidence_bases = ARRAY['outcome_capture','process_capture','human_observation']::public.evidence_basis[],
  supporting_evidence_bases = ARRAY['written_reasoning']::public.evidence_basis[]
WHERE skill_key IN ('finish_application','surface_preparation');

UPDATE public.task_skill_mappings SET
  direct_evidence_bases = ARRAY['process_capture','human_observation','telemetry']::public.evidence_basis[],
  supporting_evidence_bases = ARRAY['outcome_capture','written_reasoning']::public.evidence_basis[]
WHERE skill_key IN ('backing_maneuvers','docking','defensive_driving');

ALTER TABLE public.work_order_task_evidence_requirements
  ADD COLUMN IF NOT EXISTS response_schema jsonb;

COMMENT ON COLUMN public.work_order_task_evidence_requirements.response_schema IS
  'Optional structured entry definition: {"fields":[{"key","label","type":"number|text|integer|select","unit","required","min","max","options","order","reviewer_guidance"}]}. Learner answers are stored in evidence_artifacts.body_structured.';

-- ---------------------------------------------------------------- v2 engine
CREATE OR REPLACE FUNCTION public.compute_signal_strength_v2(p_demo uuid, p_mapping uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD; m RECORD;
  v_bases public.evidence_basis[];
  v_direct_hits int := 0;
  v_support_hits int := 0;
  v_fit numeric := 0.2;
  v_quality numeric := 0;
  v_gating numeric := 0;
  v_coverage numeric := 0;
  v_diversity numeric := 0;
  v_score numeric;
  v_value text; v_cap text; v_rank_cap int; v_rank_val int;
  v_gate_total int; v_gate_met int;
  v_req_total int; v_req_ok int;
BEGIN
  SELECT * INTO d FROM public.task_demonstrations WHERE id = p_demo;
  SELECT * INTO m FROM public.task_skill_mappings WHERE id = p_mapping;
  IF d IS NULL OR m IS NULL THEN RETURN NULL; END IF;

  SELECT array_agg(DISTINCT req.evidence_basis) INTO v_bases
  FROM public.work_order_task_evidence_requirements req
  JOIN public.evidence_artifact_requirements ear ON ear.requirement_id = req.id
  WHERE req.task_id = d.task_id AND req.is_active
    AND ear.user_id = d.user_id AND ear.completion_id = d.completion_id
    AND ear.is_active AND ear.association_status = 'accepted';
  v_bases := COALESCE(v_bases, '{}');

  -- 1. evidence-to-skill fit (is the accepted evidence direct for THIS skill?)
  SELECT count(*) INTO v_direct_hits FROM unnest(v_bases) b WHERE b = ANY (m.direct_evidence_bases);
  SELECT count(*) INTO v_support_hits FROM unnest(v_bases) b WHERE b = ANY (m.supporting_evidence_bases);
  v_fit := CASE WHEN v_direct_hits > 0 THEN 1.0
                WHEN v_support_hits > 0 THEN 0.5
                ELSE 0.2 END;

  -- 2. assessment quality across accepted associations for this task
  SELECT COALESCE(avg(
           (CASE res.outcome WHEN 'met' THEN 1.0 WHEN 'partially_met' THEN 0.5 ELSE 0.0 END)
           * (CASE res.evidence_quality WHEN 'strong' THEN 1.0 WHEN 'adequate' THEN 0.85 ELSE 0.4 END)
         ), 0)
    INTO v_quality
  FROM public.assessment_results res
  JOIN public.evidence_artifact_requirements ear ON ear.id = res.artifact_requirement_id
  JOIN public.work_order_task_evidence_requirements req ON req.id = ear.requirement_id
  WHERE req.task_id = d.task_id AND ear.user_id = d.user_id
    AND ear.completion_id = d.completion_id AND ear.is_active
    AND ear.association_status = 'accepted';

  -- 3. gating coverage: every gating criterion explicitly observed AND met
  SELECT count(*) INTO v_gate_total
  FROM public.assessment_criteria ac
  JOIN public.work_order_task_evidence_requirements req ON req.id = ac.requirement_id
  WHERE req.task_id = d.task_id AND req.is_active AND req.is_required AND ac.is_active AND ac.is_gating;

  SELECT count(DISTINCT ac.id) INTO v_gate_met
  FROM public.assessment_criteria ac
  JOIN public.work_order_task_evidence_requirements req ON req.id = ac.requirement_id
  JOIN public.assessment_results res ON res.criterion_id = ac.id
  JOIN public.evidence_artifact_requirements ear ON ear.id = res.artifact_requirement_id
  WHERE req.task_id = d.task_id AND req.is_active AND req.is_required
    AND ac.is_active AND ac.is_gating AND res.outcome = 'met'
    AND ear.user_id = d.user_id AND ear.completion_id = d.completion_id
    AND ear.is_active AND ear.association_status = 'accepted';
  v_gating := CASE WHEN v_gate_total = 0 THEN 0.5 ELSE v_gate_met::numeric / v_gate_total END;

  -- 4. evidence coverage: how many of the task's dimensions were actually evidenced
  SELECT count(*) INTO v_req_total
  FROM public.work_order_task_evidence_requirements req
  WHERE req.task_id = d.task_id AND req.is_active;

  SELECT count(DISTINCT req.id) INTO v_req_ok
  FROM public.work_order_task_evidence_requirements req
  JOIN public.evidence_artifact_requirements ear ON ear.requirement_id = req.id
  WHERE req.task_id = d.task_id AND req.is_active
    AND ear.user_id = d.user_id AND ear.completion_id = d.completion_id
    AND ear.is_active AND ear.association_status = 'accepted';
  v_coverage := CASE WHEN v_req_total = 0 THEN 0 ELSE v_req_ok::numeric / v_req_total END;

  -- 5. diversity: only counts when the mapping itself treats several bases as direct
  v_diversity := CASE
    WHEN array_length(m.direct_evidence_bases,1) > 1 AND v_direct_hits > 1 THEN 1.0
    WHEN v_direct_hits > 0 AND v_support_hits > 0 THEN 0.5
    ELSE 0 END;

  v_score := round(0.30*v_fit + 0.30*v_quality + 0.20*v_gating + 0.15*v_coverage + 0.05*v_diversity, 4);

  v_value := CASE WHEN v_score >= 0.80 THEN 'strong'
                  WHEN v_score >= 0.55 THEN 'moderate'
                  ELSE 'weak' END;

  -- a signal can never be strong on indirect evidence alone
  IF v_direct_hits = 0 AND v_value = 'strong' THEN v_value := 'moderate'; END IF;
  -- nor when a gating criterion was never observed or not met
  IF v_gating < 1 AND v_value = 'strong' THEN v_value := 'moderate'; END IF;

  v_cap := COALESCE(m.max_signal_strength, 'strong');
  v_rank_cap := CASE v_cap WHEN 'weak' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END;
  v_rank_val := CASE v_value WHEN 'weak' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END;
  IF v_rank_val > v_rank_cap THEN v_value := v_cap; END IF;

  RETURN jsonb_build_object(
    'scheme','v2_fit_weighted',
    'value', v_value,
    'confidence', v_score,
    'factors', jsonb_build_object(
      'evidence_to_skill_fit', v_fit,
      'assessment_quality', round(v_quality,4),
      'gating_coverage', round(v_gating,4),
      'evidence_coverage', round(v_coverage,4),
      'evidence_diversity', v_diversity),
    'accepted_bases', to_jsonb(v_bases),
    'direct_bases', to_jsonb(m.direct_evidence_bases),
    'supporting_bases', to_jsonb(m.supporting_evidence_bases),
    'cap', v_cap,
    'note','confidence is an internal evidence-strength measure, not a probability of real-world occupational skill'
  );
END; $$;

REVOKE ALL ON FUNCTION public.compute_signal_strength_v2(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_signal_strength_v2(uuid, uuid) TO service_role;

-- read-only shadow evaluation of an existing (v1) signal
CREATE OR REPLACE FUNCTION public.shadow_signal_strength_v2(p_signal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s RECORD; v jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'not permitted';
  END IF;
  SELECT * INTO s FROM public.skill_signals WHERE id = p_signal_id;
  IF s IS NULL THEN RETURN NULL; END IF;
  v := public.compute_signal_strength_v2(s.task_demonstration_id, s.task_skill_mapping_id);
  RETURN jsonb_build_object(
    'signal_id', s.id, 'skill_key', s.skill_key,
    'v1_scheme', s.signal_strength_scheme, 'v1_value', s.signal_strength_value, 'v1_confidence', s.confidence,
    'v2', v);
END; $$;

REVOKE ALL ON FUNCTION public.shadow_signal_strength_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shadow_signal_strength_v2(uuid) TO authenticated, service_role;

-- new signals use v2; historical v1 signals are never rewritten
CREATE OR REPLACE FUNCTION public.create_skill_signals_for_demonstration(p_demo uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD; m RECORD;
  v_created int := 0;
  v_bases public.evidence_basis[];
  v_primary public.evidence_basis;
  v_calc jsonb;
  v_signal uuid;
  b public.evidence_basis;
BEGIN
  SELECT * INTO d FROM public.task_demonstrations WHERE id = p_demo;
  IF d IS NULL OR d.status <> 'demonstrated' THEN RETURN 0; END IF;

  SELECT array_agg(DISTINCT req.evidence_basis) INTO v_bases
  FROM public.work_order_task_evidence_requirements req
  JOIN public.evidence_artifact_requirements ear ON ear.requirement_id = req.id
  WHERE req.task_id = d.task_id AND req.is_active AND req.is_required
    AND ear.user_id = d.user_id AND ear.completion_id = d.completion_id
    AND ear.is_active AND ear.association_status = 'accepted';

  IF v_bases IS NULL OR array_length(v_bases,1) IS NULL THEN RETURN 0; END IF;

  FOR m IN
    SELECT * FROM public.task_skill_mappings
    WHERE task_id = d.task_id AND is_active AND approved_by IS NOT NULL
  LOOP
    v_calc := public.compute_signal_strength_v2(p_demo, m.id);
    IF v_calc IS NULL THEN CONTINUE; END IF;

    -- primary basis is the direct basis for THIS mapping when present, else the first accepted basis
    v_primary := (SELECT x FROM unnest(v_bases) x WHERE x = ANY (m.direct_evidence_bases) LIMIT 1);
    IF v_primary IS NULL THEN v_primary := v_bases[1]; END IF;

    INSERT INTO public.skill_signals (
      user_id, skill_key, task_demonstration_id, task_skill_mapping_id,
      completion_id, tenant_id, signal_strength_scheme, signal_strength_value,
      confidence, provenance
    ) VALUES (
      d.user_id, m.skill_key, d.id, m.id, d.completion_id, d.tenant_id,
      'v2_fit_weighted', v_calc->>'value', (v_calc->>'confidence')::numeric,
      jsonb_build_object(
        'task_id', d.task_id,
        'work_order_id', d.work_order_id,
        'completion_id', d.completion_id,
        'simulation_activity_id', (SELECT simulation_activity_id FROM public.work_orders WHERE id = d.work_order_id),
        'canonical_skill_id', m.canonical_skill_id,
        'relationship', m.relationship,
        'strength_calculation', v_calc,
        'accepted_associations', (
          SELECT jsonb_agg(jsonb_build_object('association_id', ear.id, 'requirement_id', ear.requirement_id, 'artifact_id', ear.artifact_id))
          FROM public.evidence_artifact_requirements ear
          JOIN public.work_order_task_evidence_requirements req ON req.id = ear.requirement_id
          WHERE req.task_id = d.task_id AND ear.user_id = d.user_id
            AND ear.completion_id = d.completion_id AND ear.is_active
            AND ear.association_status = 'accepted'
        ),
        'note','confidence is an internal evidence-strength measure, not a probability of real-world occupational skill'
      )
    )
    ON CONFLICT (task_demonstration_id, task_skill_mapping_id) DO NOTHING
    RETURNING id INTO v_signal;

    IF v_signal IS NOT NULL THEN
      FOREACH b IN ARRAY v_bases LOOP
        INSERT INTO public.skill_signal_evidence_bases (skill_signal_id, evidence_basis, is_primary)
        VALUES (v_signal, b, b = v_primary)
        ON CONFLICT DO NOTHING;
      END LOOP;
      v_created := v_created + 1;
      v_signal := NULL;
    END IF;
  END LOOP;

  RETURN v_created;
END; $$;

-- ------------------------------------------------- automatic revision requeue
CREATE OR REPLACE FUNCTION public.requeue_task_on_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_task uuid; v_demo uuid; v_prior int;
BEGIN
  SELECT task_id INTO v_task FROM public.work_order_task_evidence_requirements WHERE id = NEW.requirement_id;
  IF v_task IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_prior
  FROM public.evidence_artifact_requirements ear
  WHERE ear.requirement_id = NEW.requirement_id
    AND ear.user_id = NEW.user_id
    AND ear.completion_id IS NOT DISTINCT FROM NEW.completion_id
    AND ear.id <> NEW.id
    AND ear.association_status IN ('needs_revision','rejected');

  IF v_prior = 0 THEN RETURN NEW; END IF;

  SELECT id INTO v_demo FROM public.task_demonstrations
   WHERE task_id = v_task AND user_id = NEW.user_id
     AND completion_id IS NOT DISTINCT FROM NEW.completion_id;
  IF v_demo IS NULL THEN RETURN NEW; END IF;

  -- reopen the review so the reviewer queue picks the revision up automatically
  UPDATE public.task_demonstrations
     SET review_completed_at = NULL, reviewed_by = NULL, updated_at = now()
   WHERE id = v_demo;

  PERFORM public.recompute_task_demonstration(v_demo);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_requeue_task_on_revision ON public.evidence_artifact_requirements;
CREATE TRIGGER trg_requeue_task_on_revision
AFTER INSERT ON public.evidence_artifact_requirements
FOR EACH ROW EXECUTE FUNCTION public.requeue_task_on_revision();
