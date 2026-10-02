DROP POLICY IF EXISTS "Learners may record own XP only" ON public.user_points;

CREATE OR REPLACE FUNCTION public.award_lesson_xp(p_lesson_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_amt integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_lesson_progress WHERE user_id = v_uid AND lesson_id = p_lesson_id AND status = 'completed') THEN
    RAISE EXCEPTION 'lesson not completed';
  END IF;
  SELECT COALESCE(xp_reward,0) INTO v_amt FROM lessons WHERE id = p_lesson_id;
  IF COALESCE(v_amt,0) <= 0 THEN RETURN 0; END IF;
  INSERT INTO user_points(user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, origin_site)
  VALUES (v_uid, 'xp', v_amt, 'lesson', p_lesson_id, 'Completed lesson', 'lesson_xp:' || p_lesson_id, 'legacy_completion', 'academy')
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  RETURN v_amt;
END $$;

CREATE OR REPLACE FUNCTION public.award_work_order_xp(p_completion_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); c record; v_base integer; v_diff text; v_amt numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO c FROM user_work_order_completions WHERE id = p_completion_id AND user_id = v_uid AND status = 'completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'work order not completed'; END IF;
  SELECT COALESCE(xp_reward,0), difficulty::text INTO v_base, v_diff FROM work_orders WHERE id = c.work_order_id;
  IF COALESCE(v_base,0) <= 0 THEN RETURN 0; END IF;
  v_amt := v_base
    * CASE WHEN c.score >= 90 THEN 1.5 WHEN c.score >= 80 THEN 1.2 ELSE 1.0 END
    * CASE WHEN c.attempt_number = 1 THEN 1.25 ELSE 1.0 END
    * CASE v_diff WHEN 'intermediate' THEN 1.2 WHEN 'advanced' THEN 1.5 ELSE 1.0 END;
  INSERT INTO user_points(user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, origin_site)
  VALUES (v_uid, 'xp', round(v_amt)::int, 'work_order', c.work_order_id, 'Completed work order', 'work_order_xp:' || c.work_order_id, 'legacy_completion', 'academy')
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  RETURN round(v_amt)::int;
END $$;

REVOKE ALL ON FUNCTION public.award_lesson_xp(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_work_order_xp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_lesson_xp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_work_order_xp(uuid) TO authenticated;