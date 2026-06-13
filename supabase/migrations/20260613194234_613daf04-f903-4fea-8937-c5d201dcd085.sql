CREATE OR REPLACE FUNCTION public.backfill_credentials_for_course(p_course_id uuid)
RETURNS TABLE(minted_count int, skipped_count int, completions_scanned int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_minted int := 0;
  v_skipped int := 0;
  v_scanned int := 0;
  v_course RECORD;
  r RECORD;
  v_passport_id uuid;
  v_completion_ref text;
  v_hash text;
BEGIN
  SELECT id, title, is_published INTO v_course FROM public.courses WHERE id = p_course_id;
  IF v_course IS NULL THEN
    RAISE EXCEPTION 'course % not found', p_course_id;
  END IF;
  IF NOT v_course.is_published THEN
    RAISE EXCEPTION 'course % is not published; publish before backfilling', p_course_id;
  END IF;

  FOR r IN
    SELECT DISTINCT
      uwc.id AS completion_id,
      uwc.user_id,
      uwc.work_order_id,
      uwc.score,
      uwc.completed_at,
      uwc.fgn_origin_challenge_id AS challenge_id,
      wo.title AS wo_title,
      wo.game_title,
      wo.skills_required
    FROM public.user_work_order_completions uwc
    JOIN public.work_orders wo ON wo.id = uwc.work_order_id
    JOIN public.challenge_lesson_mappings clm
      ON clm.fgn_origin_challenge_id = uwc.fgn_origin_challenge_id
     AND clm.is_active = true
    JOIN public.lessons l ON l.id = clm.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id
      AND uwc.status = 'completed'
      AND COALESCE(uwc.score, 0) >= 70
  LOOP
    v_scanned := v_scanned + 1;
    v_passport_id := public.ensure_skill_passport(r.user_id);
    v_completion_ref := 'completion:' || r.completion_id::text;

    IF EXISTS (
      SELECT 1 FROM public.skill_credentials
      WHERE passport_id = v_passport_id
        AND (external_reference_id = v_completion_ref
             OR external_reference_id = r.challenge_id::text)
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_hash := encode(
      extensions.digest(
        (v_passport_id::text || r.wo_title || r.completion_id::text || now()::text)::bytea,
        'sha256'),
      'hex');

    INSERT INTO public.skill_credentials (
      passport_id, credential_type, title, issuer, issuer_app_slug,
      issued_at, game_title, score, skills_verified, verification_hash,
      external_reference_id, source, metadata
    ) VALUES (
      v_passport_id, 'skill_verification',
      'Challenge Completed: ' || r.wo_title,
      'FGN Academy', 'fgn-academy-backfill',
      r.completed_at, r.game_title, r.score,
      COALESCE(r.skills_required, ARRAY[]::text[]), v_hash,
      v_completion_ref, 'course_publish_backfill',
      jsonb_build_object(
        'challenge_id', r.challenge_id,
        'completion_id', r.completion_id,
        'course_id', p_course_id,
        'backfilled_at', now()
      )
    );
    v_minted := v_minted + 1;
  END LOOP;

  RETURN QUERY SELECT v_minted, v_skipped, v_scanned;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_credentials_for_course(uuid) FROM public;
REVOKE ALL ON FUNCTION public.backfill_credentials_for_course(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.backfill_credentials_for_course(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_credentials_for_course(uuid) TO service_role;