
CREATE OR REPLACE FUNCTION public.handle_module_milestone_credential()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_module_id uuid;
  v_module_title text;
  v_module_xp integer;
  v_course_published boolean;
  v_total integer;
  v_done integer;
  v_passport_id uuid;
  v_hash text;
  v_ref text;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT m.id, m.title, m.xp_reward, c.is_published
  INTO v_module_id, v_module_title, v_module_xp, v_course_published
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = NEW.lesson_id;

  IF v_module_id IS NULL THEN RETURN NEW; END IF;
  -- Skip milestone minting for draft/unpublished courses (e.g. simulation
  -- sync stub lessons). Milestones are only meaningful for live curriculum.
  IF COALESCE(v_course_published, false) = false THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total FROM public.lessons WHERE module_id = v_module_id;
  SELECT COUNT(*) INTO v_done
  FROM public.user_lesson_progress ulp
  JOIN public.lessons l ON l.id = ulp.lesson_id
  WHERE ulp.user_id = NEW.user_id AND l.module_id = v_module_id AND ulp.status = 'completed';

  IF v_done < v_total THEN RETURN NEW; END IF;

  v_passport_id := public.ensure_skill_passport(NEW.user_id);
  v_ref := 'module:' || v_module_id::text || ':user:' || NEW.user_id::text;

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
$function$;
