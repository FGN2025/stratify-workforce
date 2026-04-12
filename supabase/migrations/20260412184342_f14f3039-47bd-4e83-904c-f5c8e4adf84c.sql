
-- Part A: Badge trigger function
CREATE OR REPLACE FUNCTION public.handle_fts_badge_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_passport_id uuid;
  v_hash text;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.lesson_id NOT IN (
    '0e1a2041-ca0b-4c49-8d07-73fe1fd51d1b',
    'd8357c5a-450e-4f3e-a90b-6f33364ffa44'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_passport_id
  FROM public.skill_passport
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF v_passport_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_hash := encode(
    sha256((v_passport_id::text || NEW.lesson_id::text || now()::text)::bytea),
    'hex'
  );

  -- FTS-CE-06 → Construction Foundation Badge
  IF NEW.lesson_id = '0e1a2041-ca0b-4c49-8d07-73fe1fd51d1b' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.skill_credentials
      WHERE passport_id = v_passport_id
      AND title = 'Construction Foundation'
      AND credential_type = 'badge'
    ) THEN
      INSERT INTO public.skill_credentials (
        passport_id, credential_type, title, issuer, issued_at,
        skills_verified, verification_hash, metadata
      ) VALUES (
        v_passport_id, 'badge', 'Construction Foundation', 'FGN Academy', now(),
        ARRAY['osp_construction','underground_fiber','aerial_fiber','811_compliance','hdd_boring','osp_handoff'],
        v_hash,
        jsonb_build_object(
          'course', 'Fiber-Tech Simulator — Challenge Enhancers',
          'tier', 1,
          'lesson_id', NEW.lesson_id,
          'unlocks', 'tier_2_challenge_enhancers'
        )
      );
    END IF;
  END IF;

  -- FTS-CE-12 → Technical Skills Badge
  IF NEW.lesson_id = 'd8357c5a-450e-4f3e-a90b-6f33364ffa44' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.skill_credentials
      WHERE passport_id = v_passport_id
      AND title = 'Technical Skills'
      AND credential_type = 'badge'
    ) THEN
      INSERT INTO public.skill_credentials (
        passport_id, credential_type, title, issuer, issued_at,
        skills_verified, verification_hash, metadata
      ) VALUES (
        v_passport_id, 'badge', 'Technical Skills', 'FGN Academy', now(),
        ARRAY['fiber_cable_types','fusion_splicing','connector_termination','fiber_testing','otdr_analysis','network_design'],
        v_hash,
        jsonb_build_object(
          'course', 'Fiber-Tech Simulator — Challenge Enhancers',
          'tier', 2,
          'lesson_id', NEW.lesson_id,
          'unlocks', 'tech_certification_pathway'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Part B: Attach trigger
CREATE TRIGGER fts_badge_on_lesson_complete
  AFTER INSERT OR UPDATE OF status
  ON public.user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fts_badge_completion();
