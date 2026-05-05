
-- ============================================================
-- Migration #1: Skill Passport enrichment (v0.3 schema lock-in)
-- ============================================================

-- 1. Add nullable columns to skill_credentials so existing
--    sync-challenge-completion and credential-api writes keep working.
ALTER TABLE public.skill_credentials
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS lesson_id uuid,
  ADD COLUMN IF NOT EXISTS module_id uuid,
  ADD COLUMN IF NOT EXISTS xp_earned integer NOT NULL DEFAULT 0;

-- Optional CHECK on source values (allow NULL for legacy rows)
ALTER TABLE public.skill_credentials
  DROP CONSTRAINT IF EXISTS skill_credentials_source_check;
ALTER TABLE public.skill_credentials
  ADD CONSTRAINT skill_credentials_source_check
  CHECK (source IS NULL OR source IN ('work_order','scorm_session','external_api','manual','course_completion','module_milestone'));

-- Idempotency for SCORM retakes: one credential per (passport, course)
-- when source is scorm_session.
CREATE UNIQUE INDEX IF NOT EXISTS skill_credentials_scorm_session_unique
  ON public.skill_credentials (passport_id, course_id)
  WHERE source = 'scorm_session';

-- ------------------------------------------------------------
-- 2. scorm_course_progress -- transient SCORM session state
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scorm_course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lesson_id uuid,
  suspend_data text,
  lesson_status text,
  lesson_location text,
  score numeric,
  attempts integer NOT NULL DEFAULT 0,
  last_session_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.scorm_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scorm progress"
  ON public.scorm_course_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own scorm progress"
  ON public.scorm_course_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own scorm progress"
  ON public.scorm_course_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all scorm progress"
  ON public.scorm_course_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_scorm_course_progress_updated_at
  BEFORE UPDATE ON public.scorm_course_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3. ensure_skill_passport helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_skill_passport(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passport_id uuid;
BEGIN
  SELECT id INTO v_passport_id FROM public.skill_passport WHERE user_id = p_user_id LIMIT 1;
  IF v_passport_id IS NULL THEN
    INSERT INTO public.skill_passport (user_id, passport_hash)
    VALUES (
      p_user_id,
      encode(extensions.digest((p_user_id::text || now()::text)::bytea, 'sha256'), 'hex')
    )
    RETURNING id INTO v_passport_id;
  END IF;
  RETURN v_passport_id;
END;
$$;

-- ------------------------------------------------------------
-- 4. Course completion trigger -- fires when completed_at set
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_course_completion_credential()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passport_id uuid;
  v_course RECORD;
  v_skills text[];
  v_xp integer;
  v_hash text;
BEGIN
  IF NEW.completed_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.completed_at IS NOT NULL THEN RETURN NEW; END IF;

  v_passport_id := public.ensure_skill_passport(NEW.user_id);

  SELECT title, xp_reward INTO v_course FROM public.courses WHERE id = NEW.course_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  -- Roll up skills from lessons in the course (via work_orders.skills if present)
  SELECT COALESCE(array_agg(DISTINCT s), ARRAY[]::text[])
  INTO v_skills
  FROM (
    SELECT unnest(COALESCE(wo.skills_required, ARRAY[]::text[])) AS s
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.work_orders wo ON wo.id = l.work_order_id
    WHERE m.course_id = NEW.course_id
  ) sub
  WHERE s IS NOT NULL;

  v_xp := COALESCE(v_course.xp_reward, 0);

  v_hash := encode(
    extensions.digest((v_passport_id::text || NEW.id::text || NEW.completed_at::text)::bytea, 'sha256'),
    'hex'
  );

  INSERT INTO public.skill_credentials (
    passport_id, credential_type, title, issuer, issued_at,
    skills_verified, verification_hash, metadata,
    source, course_id, external_reference_id, xp_earned
  )
  VALUES (
    v_passport_id, 'course_completion', v_course.title, 'FGN Academy', NEW.completed_at,
    v_skills, v_hash,
    jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id),
    'course_completion', NEW.course_id, NEW.id::text, v_xp
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_completion_credential ON public.user_course_enrollments;
CREATE TRIGGER trg_course_completion_credential
  AFTER INSERT OR UPDATE OF completed_at ON public.user_course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.handle_course_completion_credential();

-- ------------------------------------------------------------
-- 5. Module milestone trigger -- fires when last lesson in a module
--    is completed by a user.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_module_milestone_credential()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id uuid;
  v_module_title text;
  v_module_xp integer;
  v_total integer;
  v_done integer;
  v_passport_id uuid;
  v_hash text;
  v_ref text;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;

  SELECT m.id, m.title, m.xp_reward
  INTO v_module_id, v_module_title, v_module_xp
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;

  IF v_module_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total FROM public.lessons WHERE module_id = v_module_id;
  SELECT COUNT(*) INTO v_done
  FROM public.user_lesson_progress ulp
  JOIN public.lessons l ON l.id = ulp.lesson_id
  WHERE ulp.user_id = NEW.user_id AND l.module_id = v_module_id AND ulp.status = 'completed';

  IF v_done < v_total THEN RETURN NEW; END IF;

  v_passport_id := public.ensure_skill_passport(NEW.user_id);
  v_ref := 'module:' || v_module_id::text || ':user:' || NEW.user_id::text;

  -- Avoid duplicates
  IF EXISTS (
    SELECT 1 FROM public.skill_credentials
    WHERE passport_id = v_passport_id
      AND source = 'module_milestone'
      AND external_reference_id = v_ref
  ) THEN
    RETURN NEW;
  END IF;

  v_hash := encode(
    extensions.digest((v_passport_id::text || v_ref || now()::text)::bytea, 'sha256'),
    'hex'
  );

  INSERT INTO public.skill_credentials (
    passport_id, credential_type, title, issuer, issued_at,
    skills_verified, verification_hash, metadata,
    source, module_id, external_reference_id, xp_earned
  )
  VALUES (
    v_passport_id, 'badge', v_module_title || ' Milestone', 'FGN Academy', now(),
    ARRAY[]::text[], v_hash,
    jsonb_build_object('module_id', v_module_id, 'lessons_completed', v_total),
    'module_milestone', v_module_id, v_ref, COALESCE(v_module_xp, 0)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_module_milestone_credential ON public.user_lesson_progress;
CREATE TRIGGER trg_module_milestone_credential
  AFTER INSERT OR UPDATE OF status ON public.user_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_module_milestone_credential();

-- ------------------------------------------------------------
-- 6. Backfill: historical completed enrollments get credentials
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_passport_id uuid;
  v_skills text[];
  v_hash text;
BEGIN
  FOR r IN
    SELECT uce.id, uce.user_id, uce.course_id, uce.completed_at, c.title, c.xp_reward
    FROM public.user_course_enrollments uce
    JOIN public.courses c ON c.id = uce.course_id
    WHERE uce.completed_at IS NOT NULL
  LOOP
    v_passport_id := public.ensure_skill_passport(r.user_id);

    IF EXISTS (
      SELECT 1 FROM public.skill_credentials
      WHERE passport_id = v_passport_id
        AND source = 'course_completion'
        AND external_reference_id = r.id::text
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(array_agg(DISTINCT s), ARRAY[]::text[])
    INTO v_skills
    FROM (
      SELECT unnest(COALESCE(wo.skills_required, ARRAY[]::text[])) AS s
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      LEFT JOIN public.work_orders wo ON wo.id = l.work_order_id
      WHERE m.course_id = r.course_id
    ) sub WHERE s IS NOT NULL;

    v_hash := encode(
      extensions.digest((v_passport_id::text || r.id::text || r.completed_at::text)::bytea, 'sha256'),
      'hex'
    );

    INSERT INTO public.skill_credentials (
      passport_id, credential_type, title, issuer, issued_at,
      skills_verified, verification_hash, metadata,
      source, course_id, external_reference_id, xp_earned
    )
    VALUES (
      v_passport_id, 'course_completion', r.title, 'FGN Academy', r.completed_at,
      v_skills, v_hash,
      jsonb_build_object('enrollment_id', r.id, 'course_id', r.course_id, 'backfilled', true),
      'course_completion', r.course_id, r.id::text, COALESCE(r.xp_reward, 0)
    );
  END LOOP;
END $$;
