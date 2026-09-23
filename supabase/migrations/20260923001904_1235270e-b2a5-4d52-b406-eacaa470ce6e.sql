
-- Lock down internal helpers (trigger functions are never called directly)
REVOKE EXECUTE ON FUNCTION public.stamp_evidence_artifact_context() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.stamp_association_context() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.stamp_assessment_result_context() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.evidence_tenant_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_review_tenant_evidence(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.task_work_order_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.requirement_task_id(uuid) FROM anon;

-- ============ RECOMPUTE ============
CREATE OR REPLACE FUNCTION public.recompute_task_demonstration(p_demo uuid)
RETURNS public.demonstration_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d RECORD;
  v_required int := 0;
  v_satisfied int := 0;
  v_any_assoc int := 0;
  v_needs_revision int := 0;
  v_gating_unmet int := 0;
  v_status public.demonstration_status;
  v_note jsonb := '[]'::jsonb;
  r RECORD;
BEGIN
  SELECT * INTO d FROM public.task_demonstrations WHERE id = p_demo;
  IF d IS NULL THEN RETURN NULL; END IF;

  FOR r IN
    SELECT req.id, req.requirement_key, req.is_required
    FROM public.work_order_task_evidence_requirements req
    WHERE req.task_id = d.task_id AND req.is_active
  LOOP
    DECLARE
      v_accepted int;
      v_assoc int;
      v_rev int;
      v_unmet int;
    BEGIN
      SELECT count(*) FILTER (WHERE ear.association_status = 'accepted'),
             count(*),
             count(*) FILTER (WHERE ear.association_status = 'needs_revision')
        INTO v_accepted, v_assoc, v_rev
      FROM public.evidence_artifact_requirements ear
      WHERE ear.requirement_id = r.id
        AND ear.user_id = d.user_id
        AND ear.completion_id = d.completion_id
        AND ear.is_active;

      SELECT count(*) INTO v_unmet
      FROM public.assessment_criteria ac
      WHERE ac.requirement_id = r.id AND ac.is_active AND ac.is_gating
        AND NOT EXISTS (
          SELECT 1 FROM public.assessment_results res
          JOIN public.evidence_artifact_requirements ear2 ON ear2.id = res.artifact_requirement_id
          WHERE res.criterion_id = ac.id
            AND res.outcome = 'met'
            AND ear2.requirement_id = r.id
            AND ear2.user_id = d.user_id
            AND ear2.completion_id = d.completion_id
            AND ear2.is_active
            AND ear2.association_status = 'accepted'
        );

      v_any_assoc := v_any_assoc + v_assoc;
      v_needs_revision := v_needs_revision + v_rev;
      IF r.is_required THEN
        v_required := v_required + 1;
        IF v_accepted > 0 AND v_unmet = 0 THEN v_satisfied := v_satisfied + 1; END IF;
        v_gating_unmet := v_gating_unmet + v_unmet;
      END IF;

      v_note := v_note || jsonb_build_object(
        'requirement_key', r.requirement_key,
        'required', r.is_required,
        'accepted_associations', v_accepted,
        'associations', v_assoc,
        'gating_unmet', v_unmet
      );
    END;
  END LOOP;

  IF d.review_completed_at IS NOT NULL THEN
    IF v_required > 0 AND v_satisfied = v_required AND v_gating_unmet = 0 THEN
      v_status := 'demonstrated';
    ELSE
      v_status := 'not_demonstrated';
    END IF;
  ELSIF v_needs_revision > 0 THEN
    v_status := 'needs_revision';
  ELSIF EXISTS (
    SELECT 1 FROM public.evidence_artifact_requirements ear
    JOIN public.work_order_task_evidence_requirements req ON req.id = ear.requirement_id
    WHERE req.task_id = d.task_id AND ear.user_id = d.user_id
      AND ear.completion_id = d.completion_id AND ear.is_active
      AND ear.association_status IN ('under_review','accepted','rejected')
  ) THEN
    v_status := 'under_review';
  ELSIF v_any_assoc > 0 THEN
    v_status := 'evidence_submitted';
  ELSE
    v_status := 'not_started';
  END IF;

  UPDATE public.task_demonstrations
     SET status = v_status,
         demonstrated_at = CASE WHEN v_status = 'demonstrated' THEN COALESCE(demonstrated_at, now()) ELSE NULL END,
         computed_note = jsonb_build_object('requirements', v_note, 'computed_at', now()),
         updated_at = now()
   WHERE id = p_demo;

  RETURN v_status;
END; $$;
REVOKE EXECUTE ON FUNCTION public.recompute_task_demonstration(uuid) FROM anon;

-- ============ SKILL SIGNAL CREATION ============
CREATE OR REPLACE FUNCTION public.create_skill_signals_for_demonstration(p_demo uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d RECORD;
  m RECORD;
  v_created int := 0;
  v_bases public.evidence_basis[];
  v_primary public.evidence_basis;
  v_quality text;
  v_value text;
  v_cap text;
  v_conf numeric;
  v_signal uuid;
  b public.evidence_basis;
  v_rank_cap int;
  v_rank_val int;
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

  SELECT CASE
           WHEN bool_and(res.evidence_quality = 'strong') THEN 'strong'
           WHEN bool_or(res.evidence_quality = 'insufficient') THEN 'insufficient'
           ELSE 'adequate' END
    INTO v_quality
  FROM public.assessment_results res
  JOIN public.evidence_artifact_requirements ear ON ear.id = res.artifact_requirement_id
  JOIN public.work_order_task_evidence_requirements req ON req.id = ear.requirement_id
  WHERE req.task_id = d.task_id AND ear.user_id = d.user_id
    AND ear.completion_id = d.completion_id AND ear.association_status = 'accepted';
  v_quality := COALESCE(v_quality, 'adequate');

  -- primary basis: strongest available under v1 ordering
  v_primary := (SELECT x FROM unnest(v_bases) x
                ORDER BY CASE x WHEN 'telemetry' THEN 1 WHEN 'human_observation' THEN 2
                                WHEN 'process_capture' THEN 3 WHEN 'written_reasoning' THEN 4
                                WHEN 'structured_result' THEN 5 ELSE 6 END
                LIMIT 1);

  FOR m IN
    SELECT * FROM public.task_skill_mappings
    WHERE task_id = d.task_id AND is_active AND approved_by IS NOT NULL
  LOOP
    -- v1_three_band
    IF v_quality = 'insufficient' THEN
      v_value := 'weak';
    ELSIF v_primary IN ('process_capture','human_observation','telemetry') AND v_quality = 'strong' THEN
      v_value := 'strong';
    ELSIF v_primary IN ('process_capture','human_observation','telemetry','written_reasoning') THEN
      v_value := 'moderate';
    ELSE
      v_value := CASE WHEN v_quality = 'strong' THEN 'moderate' ELSE 'weak' END;
    END IF;

    v_cap := m.max_signal_strength;
    v_rank_cap := CASE v_cap WHEN 'weak' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END;
    v_rank_val := CASE v_value WHEN 'weak' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END;
    IF v_rank_val > v_rank_cap THEN v_value := v_cap; END IF;

    v_conf := CASE v_value WHEN 'weak' THEN 0.30 WHEN 'moderate' THEN 0.60 ELSE 0.85 END;

    INSERT INTO public.skill_signals (
      user_id, skill_key, task_demonstration_id, task_skill_mapping_id,
      completion_id, tenant_id, signal_strength_scheme, signal_strength_value,
      confidence, provenance
    ) VALUES (
      d.user_id, m.skill_key, d.id, m.id, d.completion_id, d.tenant_id,
      'v1_three_band', v_value, v_conf,
      jsonb_build_object(
        'task_id', d.task_id,
        'work_order_id', d.work_order_id,
        'completion_id', d.completion_id,
        'simulation_activity_id', (SELECT simulation_activity_id FROM public.work_orders WHERE id = d.work_order_id),
        'relationship', m.relationship,
        'evidence_quality', v_quality,
        'accepted_associations', (
          SELECT jsonb_agg(jsonb_build_object('association_id', ear.id, 'requirement_id', ear.requirement_id, 'artifact_id', ear.artifact_id))
          FROM public.evidence_artifact_requirements ear
          JOIN public.work_order_task_evidence_requirements req ON req.id = ear.requirement_id
          WHERE req.task_id = d.task_id AND ear.user_id = d.user_id
            AND ear.completion_id = d.completion_id AND ear.is_active
            AND ear.association_status = 'accepted'
        ),
        'note', 'confidence is an internal evidence-strength measure, not a probability of real-world occupational skill'
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
REVOKE EXECUTE ON FUNCTION public.create_skill_signals_for_demonstration(uuid) FROM anon, authenticated, public;

-- ============ LEARNER RPC: ensure demonstration row ============
CREATE OR REPLACE FUNCTION public.ensure_task_demonstration(p_task_id uuid, p_completion_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  c RECORD;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO c FROM public.user_work_order_completions WHERE id = p_completion_id;
  IF c IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF c.user_id <> v_user AND NOT public.can_review_tenant_evidence(public.evidence_tenant_for_user(c.user_id)) THEN
    RAISE EXCEPTION 'not permitted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.work_order_tasks WHERE id = p_task_id AND work_order_id = c.work_order_id) THEN
    RAISE EXCEPTION 'task does not belong to this work order';
  END IF;

  INSERT INTO public.task_demonstrations (user_id, task_id, work_order_id, completion_id, tenant_id)
  VALUES (c.user_id, p_task_id, c.work_order_id, p_completion_id, public.evidence_tenant_for_user(c.user_id))
  ON CONFLICT (user_id, task_id, completion_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.recompute_task_demonstration(v_id);
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.ensure_task_demonstration(uuid, uuid) FROM anon;

-- ============ REVIEWER RPC: complete review ============
CREATE OR REPLACE FUNCTION public.complete_task_review(p_demonstration_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d RECORD;
  v_status public.demonstration_status;
  v_signals int := 0;
BEGIN
  SELECT * INTO d FROM public.task_demonstrations WHERE id = p_demonstration_id;
  IF d IS NULL THEN RAISE EXCEPTION 'demonstration not found'; END IF;
  IF NOT public.can_review_tenant_evidence(d.tenant_id) THEN RAISE EXCEPTION 'not permitted'; END IF;

  UPDATE public.task_demonstrations
     SET reviewed_by = auth.uid(), review_completed_at = now(), updated_at = now()
   WHERE id = p_demonstration_id;

  v_status := public.recompute_task_demonstration(p_demonstration_id);
  IF v_status = 'demonstrated' THEN
    v_signals := public.create_skill_signals_for_demonstration(p_demonstration_id);
  END IF;

  RETURN jsonb_build_object('status', v_status, 'skill_signals_created', v_signals);
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_task_review(uuid) FROM anon;

-- ============ REVIEWER RPC: reopen review (revision cycle) ============
CREATE OR REPLACE FUNCTION public.reopen_task_review(p_demonstration_id uuid)
RETURNS public.demonstration_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD;
BEGIN
  SELECT * INTO d FROM public.task_demonstrations WHERE id = p_demonstration_id;
  IF d IS NULL THEN RAISE EXCEPTION 'demonstration not found'; END IF;
  IF NOT public.can_review_tenant_evidence(d.tenant_id) THEN RAISE EXCEPTION 'not permitted'; END IF;
  UPDATE public.task_demonstrations SET review_completed_at = NULL, updated_at = now() WHERE id = p_demonstration_id;
  RETURN public.recompute_task_demonstration(p_demonstration_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.reopen_task_review(uuid) FROM anon;

-- ============ AUTO-RECOMPUTE TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_demonstration_from_association()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task uuid; v_demo uuid; v_row RECORD;
BEGIN
  v_row := COALESCE(NEW, OLD);
  SELECT task_id INTO v_task FROM public.work_order_task_evidence_requirements WHERE id = v_row.requirement_id;
  SELECT id INTO v_demo FROM public.task_demonstrations
   WHERE user_id = v_row.user_id AND task_id = v_task AND completion_id = v_row.completion_id;
  IF v_demo IS NOT NULL THEN PERFORM public.recompute_task_demonstration(v_demo); END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.touch_demonstration_from_association() FROM anon, authenticated, public;
CREATE TRIGGER trg_assoc_recompute AFTER INSERT OR UPDATE OR DELETE ON public.evidence_artifact_requirements
FOR EACH ROW EXECUTE FUNCTION public.touch_demonstration_from_association();

CREATE OR REPLACE FUNCTION public.touch_demonstration_from_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task uuid; v_demo uuid; v_assoc RECORD; v_row RECORD;
BEGIN
  v_row := COALESCE(NEW, OLD);
  SELECT ear.user_id, ear.completion_id, req.task_id INTO v_assoc
  FROM public.evidence_artifact_requirements ear
  JOIN public.work_order_task_evidence_requirements req ON req.id = ear.requirement_id
  WHERE ear.id = v_row.artifact_requirement_id;
  IF v_assoc IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_demo FROM public.task_demonstrations
   WHERE user_id = v_assoc.user_id AND task_id = v_assoc.task_id AND completion_id = v_assoc.completion_id;
  IF v_demo IS NOT NULL THEN PERFORM public.recompute_task_demonstration(v_demo); END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.touch_demonstration_from_result() FROM anon, authenticated, public;
CREATE TRIGGER trg_result_recompute AFTER INSERT OR UPDATE OR DELETE ON public.assessment_results
FOR EACH ROW EXECUTE FUNCTION public.touch_demonstration_from_result();
