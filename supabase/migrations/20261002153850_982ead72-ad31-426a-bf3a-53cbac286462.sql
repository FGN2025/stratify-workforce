CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(p_lesson_id uuid, p_answers jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_keys jsonb; l record; q jsonb; k jsonb;
  v_total int := 0; v_correct int := 0; v_pct int; v_passed boolean; v_xp int := 0;
  v_results jsonb := '[]'::jsonb; v_existing record; v_sel int; v_ok boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.can_access_lesson(p_lesson_id, v_uid) THEN RAISE EXCEPTION 'no access to this lesson'; END IF;
  SELECT id, content, COALESCE(passing_score,70) ps, COALESCE(xp_reward,0) xp INTO l FROM lessons WHERE id = p_lesson_id;
  SELECT answers INTO v_keys FROM lesson_quiz_keys WHERE lesson_id = p_lesson_id;
  IF v_keys IS NULL OR jsonb_typeof(l.content->'questions') <> 'array' THEN RAISE EXCEPTION 'quiz not available'; END IF;

  FOR q IN SELECT * FROM jsonb_array_elements(l.content->'questions') LOOP
    k := v_keys -> (q->>'id');
    CONTINUE WHEN k IS NULL;
    v_total := v_total + 1;
    v_sel := NULLIF(p_answers->>(q->>'id'),'')::int;
    v_ok := v_sel IS NOT NULL AND v_sel = (k->>'correct_index')::int;
    IF v_ok THEN v_correct := v_correct + 1; END IF;
    v_results := v_results || jsonb_build_array(jsonb_build_object('id', q->>'id', 'correct', v_ok, 'explanation', k->'explanation', 'correct_index', (k->>'correct_index')::int));
  END LOOP;
  IF v_total = 0 THEN RAISE EXCEPTION 'quiz not available'; END IF;

  v_pct := round(v_correct * 100.0 / v_total);
  v_passed := v_pct >= l.ps;

  PERFORM set_config('app.lesson_grading','on', true);
  SELECT id, attempts, status INTO v_existing FROM user_lesson_progress WHERE user_id = v_uid AND lesson_id = p_lesson_id;
  IF FOUND THEN
    IF v_existing.status = 'completed' THEN
      UPDATE user_lesson_progress SET attempts = attempts + 1, score = GREATEST(COALESCE(score,0), v_pct) WHERE id = v_existing.id;
    ELSE
      UPDATE user_lesson_progress SET attempts = attempts + 1, score = v_pct,
        status = (CASE WHEN v_passed THEN 'completed' ELSE 'failed' END)::progress_status,
        xp_earned = CASE WHEN v_passed THEN l.xp ELSE 0 END,
        completed_at = CASE WHEN v_passed THEN now() ELSE NULL END
      WHERE id = v_existing.id;
    END IF;
  ELSE
    INSERT INTO user_lesson_progress(user_id, lesson_id, status, score, attempts, xp_earned, started_at, completed_at)
    VALUES (v_uid, p_lesson_id, (CASE WHEN v_passed THEN 'completed' ELSE 'failed' END)::progress_status, v_pct, 1,
      CASE WHEN v_passed THEN l.xp ELSE 0 END, now(), CASE WHEN v_passed THEN now() ELSE NULL END);
  END IF;
  PERFORM set_config('app.lesson_grading','off', true);

  IF v_passed AND l.xp > 0 THEN
    INSERT INTO user_points(user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, origin_site)
    VALUES (v_uid, 'xp', l.xp, 'lesson', p_lesson_id, 'Completed lesson', 'lesson_xp:' || p_lesson_id, 'legacy_completion', 'academy')
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
    IF FOUND THEN v_xp := l.xp; END IF;
  END IF;

  -- Reveal answers and explanations only on a pass
  IF NOT v_passed THEN
    SELECT COALESCE(jsonb_agg(r - 'correct_index' - 'explanation'), '[]'::jsonb) INTO v_results FROM jsonb_array_elements(v_results) r;
  END IF;

  RETURN jsonb_build_object('correct', v_correct, 'total', v_total, 'pct', v_pct, 'passed', v_passed, 'xpEarned', v_xp, 'results', v_results);
END $function$;