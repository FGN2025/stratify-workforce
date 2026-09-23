
-- ============ ENUMS ============
CREATE TYPE public.evidence_type AS ENUM ('screenshot','video_clip','video_timecode_reference','before_after_pair','written_annotation','structured_form','document');
CREATE TYPE public.evidence_basis AS ENUM ('outcome_capture','process_capture','written_reasoning','structured_result','human_observation','telemetry');
CREATE TYPE public.artifact_status AS ENUM ('draft','submitted','under_review','superseded','withdrawn');
CREATE TYPE public.association_status AS ENUM ('claimed','under_review','accepted','rejected','needs_revision');
CREATE TYPE public.assessment_outcome AS ENUM ('met','partially_met','not_met');
CREATE TYPE public.evidence_quality AS ENUM ('insufficient','adequate','strong');
CREATE TYPE public.skill_relationship AS ENUM ('primary','supporting','prerequisite_context');
CREATE TYPE public.demonstration_status AS ENUM ('not_started','evidence_submitted','under_review','needs_revision','demonstrated','not_demonstrated');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.evidence_tenant_for_user(p_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.current_or_user_tenant(p_user); $$;

CREATE OR REPLACE FUNCTION public.can_review_tenant_evidence(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'super_admin'::app_role)
      OR (p_tenant IS NOT NULL AND public.is_tenant_admin(auth.uid(), p_tenant));
$$;

CREATE OR REPLACE FUNCTION public.task_work_order_id(p_task uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT work_order_id FROM public.work_order_tasks WHERE id = p_task; $$;

-- ============ 1. REQUIREMENTS ============
CREATE TABLE public.work_order_task_evidence_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.work_order_tasks(id) ON DELETE CASCADE,
  requirement_key text NOT NULL,
  label text NOT NULL,
  instructions text,
  accepted_evidence_types public.evidence_type[] NOT NULL,
  evidence_basis public.evidence_basis NOT NULL,
  min_artifacts int NOT NULL DEFAULT 1,
  max_artifacts int NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT true,
  min_duration_seconds int,
  requires_pair boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  provenance text NOT NULL DEFAULT 'authored',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wotr_types_nonempty CHECK (array_length(accepted_evidence_types,1) >= 1),
  CONSTRAINT wotr_provenance_chk CHECK (provenance IN ('authored','derived_from_legacy_blob')),
  CONSTRAINT wotr_key_unique UNIQUE (task_id, requirement_key)
);
CREATE INDEX idx_wotr_task_order ON public.work_order_task_evidence_requirements(task_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_task_evidence_requirements TO authenticated;
GRANT ALL ON public.work_order_task_evidence_requirements TO service_role;
ALTER TABLE public.work_order_task_evidence_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_read_visible_work_order" ON public.work_order_task_evidence_requirements FOR SELECT TO authenticated
USING (public.is_work_order_visible(auth.uid(), public.task_work_order_id(task_id)));
CREATE POLICY "req_admin_write" ON public.work_order_task_evidence_requirements FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.requirement_task_id(p_requirement uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT task_id FROM public.work_order_task_evidence_requirements WHERE id = p_requirement; $$;

-- ============ 2. ARTIFACTS ============
CREATE TABLE public.evidence_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  completion_id uuid REFERENCES public.user_work_order_completions(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  artifact_kind text NOT NULL DEFAULT 'file',
  storage_path text,
  mime_type text,
  duration_seconds numeric,
  file_size int,
  body_text text,
  body_structured jsonb,
  title text,
  captured_at timestamptz,
  submitted_at timestamptz,
  status public.artifact_status NOT NULL DEFAULT 'draft',
  superseded_by_artifact_id uuid REFERENCES public.evidence_artifacts(id) ON DELETE SET NULL,
  is_legacy boolean NOT NULL DEFAULT false,
  legacy_task_attribution text NOT NULL DEFAULT 'not_applicable',
  legacy_evidence_id uuid REFERENCES public.work_order_evidence(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ea_kind_chk CHECK (artifact_kind IN ('file','text')),
  CONSTRAINT ea_legacy_attr_chk CHECK (legacy_task_attribution IN ('not_applicable','deterministic','unknown')),
  CONSTRAINT ea_payload_chk CHECK (
    (artifact_kind = 'file' AND storage_path IS NOT NULL)
    OR (artifact_kind = 'text' AND (body_text IS NOT NULL OR body_structured IS NOT NULL))
  )
);
CREATE INDEX idx_ea_user_wo ON public.evidence_artifacts(user_id, work_order_id);
CREATE INDEX idx_ea_completion ON public.evidence_artifacts(completion_id);
CREATE INDEX idx_ea_tenant ON public.evidence_artifacts(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_artifacts TO authenticated;
GRANT ALL ON public.evidence_artifacts TO service_role;
ALTER TABLE public.evidence_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artifact_owner_select" ON public.evidence_artifacts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_review_tenant_evidence(tenant_id));
CREATE POLICY "artifact_owner_insert" ON public.evidence_artifacts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND is_legacy = false);
CREATE POLICY "artifact_owner_update" ON public.evidence_artifacts FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status IN ('draft','submitted'))
WITH CHECK (user_id = auth.uid());
CREATE POLICY "artifact_reviewer_update" ON public.evidence_artifacts FOR UPDATE TO authenticated
USING (public.can_review_tenant_evidence(tenant_id))
WITH CHECK (public.can_review_tenant_evidence(tenant_id));
CREATE POLICY "artifact_owner_delete_draft" ON public.evidence_artifacts FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'draft');

-- stamp tenant + completion-derived context
CREATE OR REPLACE FUNCTION public.stamp_evidence_artifact_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.evidence_tenant_for_user(NEW.user_id);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ea_context BEFORE INSERT OR UPDATE ON public.evidence_artifacts
FOR EACH ROW EXECUTE FUNCTION public.stamp_evidence_artifact_context();

-- ============ 3. ASSOCIATIONS ============
CREATE TABLE public.evidence_artifact_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.evidence_artifacts(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.work_order_task_evidence_requirements(id) ON DELETE CASCADE,
  completion_id uuid REFERENCES public.user_work_order_completions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  association_status public.association_status NOT NULL DEFAULT 'claimed',
  learner_rationale text,
  timecode_start_seconds numeric,
  timecode_end_seconds numeric,
  page_number int,
  frame_reference text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ear_unique UNIQUE (artifact_id, requirement_id, completion_id),
  CONSTRAINT ear_timecode_chk CHECK (timecode_end_seconds IS NULL OR timecode_start_seconds IS NULL OR timecode_end_seconds >= timecode_start_seconds)
);
CREATE INDEX idx_ear_requirement ON public.evidence_artifact_requirements(requirement_id, association_status);
CREATE INDEX idx_ear_completion ON public.evidence_artifact_requirements(completion_id);
CREATE INDEX idx_ear_tenant ON public.evidence_artifact_requirements(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_artifact_requirements TO authenticated;
GRANT ALL ON public.evidence_artifact_requirements TO service_role;
ALTER TABLE public.evidence_artifact_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assoc_owner_select" ON public.evidence_artifact_requirements FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_review_tenant_evidence(tenant_id));
CREATE POLICY "assoc_owner_insert" ON public.evidence_artifact_requirements FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND association_status = 'claimed'
  AND EXISTS (SELECT 1 FROM public.evidence_artifacts a WHERE a.id = artifact_id AND a.user_id = auth.uid()));
CREATE POLICY "assoc_owner_update" ON public.evidence_artifact_requirements FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND association_status IN ('claimed','needs_revision'))
WITH CHECK (user_id = auth.uid() AND association_status IN ('claimed','needs_revision'));
CREATE POLICY "assoc_reviewer_update" ON public.evidence_artifact_requirements FOR UPDATE TO authenticated
USING (public.can_review_tenant_evidence(tenant_id))
WITH CHECK (public.can_review_tenant_evidence(tenant_id));

CREATE OR REPLACE FUNCTION public.stamp_association_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a RECORD;
BEGIN
  SELECT user_id, tenant_id, completion_id INTO v_a FROM public.evidence_artifacts WHERE id = NEW.artifact_id;
  NEW.user_id := v_a.user_id;
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := v_a.tenant_id; END IF;
  IF NEW.completion_id IS NULL THEN NEW.completion_id := v_a.completion_id; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ear_context BEFORE INSERT OR UPDATE ON public.evidence_artifact_requirements
FOR EACH ROW EXECUTE FUNCTION public.stamp_association_context();

-- ============ 4. CRITERIA ============
CREATE TABLE public.assessment_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.work_order_task_evidence_requirements(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  criterion_text text NOT NULL,
  guidance_for_reviewer text,
  weight numeric NOT NULL DEFAULT 1,
  is_gating boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ac_unique UNIQUE (requirement_id, criterion_key)
);
CREATE INDEX idx_ac_requirement ON public.assessment_criteria(requirement_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_criteria TO authenticated;
GRANT ALL ON public.assessment_criteria TO service_role;
ALTER TABLE public.assessment_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "criteria_read_visible" ON public.assessment_criteria FOR SELECT TO authenticated
USING (public.is_work_order_visible(auth.uid(), public.task_work_order_id(public.requirement_task_id(requirement_id))));
CREATE POLICY "criteria_admin_write" ON public.assessment_criteria FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ============ 5. RESULTS ============
CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_requirement_id uuid NOT NULL REFERENCES public.evidence_artifact_requirements(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.assessment_criteria(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  subject_user_id uuid,
  outcome public.assessment_outcome NOT NULL,
  evidence_quality public.evidence_quality NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewer_note text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_unique UNIQUE (artifact_requirement_id, criterion_id, reviewer_id)
);
CREATE INDEX idx_ar_assoc ON public.assessment_results(artifact_requirement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_results TO authenticated;
GRANT ALL ON public.assessment_results TO service_role;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_select" ON public.assessment_results FOR SELECT TO authenticated
USING (subject_user_id = auth.uid() OR public.can_review_tenant_evidence(tenant_id));
CREATE POLICY "results_reviewer_write" ON public.assessment_results FOR ALL TO authenticated
USING (public.can_review_tenant_evidence(tenant_id) AND reviewer_id = auth.uid())
WITH CHECK (public.can_review_tenant_evidence(tenant_id) AND reviewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.stamp_assessment_result_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD;
BEGIN
  SELECT user_id, tenant_id INTO v FROM public.evidence_artifact_requirements WHERE id = NEW.artifact_requirement_id;
  NEW.subject_user_id := v.user_id;
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := v.tenant_id; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ar_context BEFORE INSERT OR UPDATE ON public.assessment_results
FOR EACH ROW EXECUTE FUNCTION public.stamp_assessment_result_context();

-- ============ 6. TASK SKILL MAPPINGS ============
CREATE TABLE public.task_skill_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.work_order_tasks(id) ON DELETE CASCADE,
  skill_key text NOT NULL,
  relationship public.skill_relationship NOT NULL DEFAULT 'primary',
  expected_evidence_basis public.evidence_basis[] NOT NULL DEFAULT '{}',
  max_signal_strength text NOT NULL DEFAULT 'moderate',
  rationale text,
  mapping_version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tsm_unique UNIQUE (task_id, skill_key, mapping_version),
  CONSTRAINT tsm_strength_chk CHECK (max_signal_strength IN ('weak','moderate','strong'))
);
CREATE INDEX idx_tsm_task ON public.task_skill_mappings(task_id) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_skill_mappings TO authenticated;
GRANT ALL ON public.task_skill_mappings TO service_role;
ALTER TABLE public.task_skill_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tsm_read_visible" ON public.task_skill_mappings FOR SELECT TO authenticated
USING (public.is_work_order_visible(auth.uid(), public.task_work_order_id(task_id)));
CREATE POLICY "tsm_admin_write" ON public.task_skill_mappings FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ============ 7. TASK DEMONSTRATIONS ============
CREATE TABLE public.task_demonstrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.work_order_tasks(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  completion_id uuid NOT NULL REFERENCES public.user_work_order_completions(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  status public.demonstration_status NOT NULL DEFAULT 'not_started',
  demonstrated_at timestamptz,
  reviewed_by uuid,
  review_completed_at timestamptz,
  computed_note jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT td_unique UNIQUE (user_id, task_id, completion_id)
);
CREATE INDEX idx_td_completion ON public.task_demonstrations(completion_id, status);
CREATE INDEX idx_td_tenant ON public.task_demonstrations(tenant_id);
GRANT SELECT, INSERT, UPDATE ON public.task_demonstrations TO authenticated;
GRANT ALL ON public.task_demonstrations TO service_role;
ALTER TABLE public.task_demonstrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "td_select" ON public.task_demonstrations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_review_tenant_evidence(tenant_id));
CREATE POLICY "td_reviewer_update" ON public.task_demonstrations FOR UPDATE TO authenticated
USING (public.can_review_tenant_evidence(tenant_id))
WITH CHECK (public.can_review_tenant_evidence(tenant_id));

-- ============ 8. STRENGTH SCHEMES ============
CREATE TABLE public.signal_strength_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_key text NOT NULL UNIQUE,
  description text NOT NULL,
  allowed_values text[] NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signal_strength_schemes TO authenticated;
GRANT ALL ON public.signal_strength_schemes TO service_role;
ALTER TABLE public.signal_strength_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schemes_read" ON public.signal_strength_schemes FOR SELECT TO authenticated USING (true);
INSERT INTO public.signal_strength_schemes (scheme_key, description, allowed_values)
VALUES ('v1_three_band','Strength derived from contributing evidence bases and assessed evidence quality, capped by the task skill mapping. Confidence is an internal evidence-strength measure, NOT a calibrated probability of real-world occupational skill.', ARRAY['weak','moderate','strong']);

-- ============ 9. SKILL SIGNALS ============
CREATE TABLE public.skill_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_key text NOT NULL,
  task_demonstration_id uuid NOT NULL REFERENCES public.task_demonstrations(id) ON DELETE CASCADE,
  task_skill_mapping_id uuid NOT NULL REFERENCES public.task_skill_mappings(id) ON DELETE CASCADE,
  completion_id uuid REFERENCES public.user_work_order_completions(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  signal_strength_scheme text NOT NULL DEFAULT 'v1_three_band',
  signal_strength_value text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  is_superseded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ss_unique UNIQUE (task_demonstration_id, task_skill_mapping_id),
  CONSTRAINT ss_conf_chk CHECK (confidence >= 0 AND confidence <= 1)
);
CREATE INDEX idx_ss_user_skill ON public.skill_signals(user_id, skill_key);
GRANT SELECT ON public.skill_signals TO authenticated;
GRANT ALL ON public.skill_signals TO service_role;
ALTER TABLE public.skill_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_select" ON public.skill_signals FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_review_tenant_evidence(tenant_id));

-- contributing evidence bases (normalized; never duplicate a signal per basis)
CREATE TABLE public.skill_signal_evidence_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_signal_id uuid NOT NULL REFERENCES public.skill_signals(id) ON DELETE CASCADE,
  evidence_basis public.evidence_basis NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ssb_unique UNIQUE (skill_signal_id, evidence_basis)
);
CREATE UNIQUE INDEX idx_ssb_one_primary ON public.skill_signal_evidence_bases(skill_signal_id) WHERE is_primary;
GRANT SELECT ON public.skill_signal_evidence_bases TO authenticated;
GRANT ALL ON public.skill_signal_evidence_bases TO service_role;
ALTER TABLE public.skill_signal_evidence_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_bases_select" ON public.skill_signal_evidence_bases FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.skill_signals s WHERE s.id = skill_signal_id
  AND (s.user_id = auth.uid() OR public.can_review_tenant_evidence(s.tenant_id))));

-- ============ 10. SKILL VERIFICATION (dormant) ============
CREATE TABLE public.skill_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_key text NOT NULL,
  verified_by uuid NOT NULL,
  verification_policy_ref text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sv_user ON public.skill_verifications(user_id, skill_key);
GRANT SELECT ON public.skill_verifications TO authenticated;
GRANT ALL ON public.skill_verifications TO service_role;
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif_select" ON public.skill_verifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_review_tenant_evidence(tenant_id));
CREATE POLICY "verif_admin_insert" ON public.skill_verifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) AND verified_by = auth.uid());

CREATE TABLE public.skill_verification_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_verification_id uuid NOT NULL REFERENCES public.skill_verifications(id) ON DELETE CASCADE,
  skill_signal_id uuid NOT NULL REFERENCES public.skill_signals(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT svs_unique UNIQUE (skill_verification_id, skill_signal_id)
);
GRANT SELECT ON public.skill_verification_signals TO authenticated;
GRANT ALL ON public.skill_verification_signals TO service_role;
ALTER TABLE public.skill_verification_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif_signals_select" ON public.skill_verification_signals FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.skill_verifications v WHERE v.id = skill_verification_id
  AND (v.user_id = auth.uid() OR public.can_review_tenant_evidence(v.tenant_id))));
CREATE POLICY "verif_signals_admin_insert" ON public.skill_verification_signals FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ============ UPDATED_AT TRIGGERS ============
CREATE TRIGGER trg_wotr_updated BEFORE UPDATE ON public.work_order_task_evidence_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ac_updated BEFORE UPDATE ON public.assessment_criteria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tsm_updated BEFORE UPDATE ON public.task_skill_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_td_updated BEFORE UPDATE ON public.task_demonstrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
