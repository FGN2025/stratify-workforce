CREATE TABLE public.lesson_quiz_keys (
  lesson_id uuid PRIMARY KEY,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lesson_quiz_keys TO authenticated;
GRANT ALL ON public.lesson_quiz_keys TO service_role;
ALTER TABLE public.lesson_quiz_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read quiz keys" ON public.lesson_quiz_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.extract_lesson_quiz_keys()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q jsonb; v_keys jsonb := '{}'::jsonb; v_clean jsonb := '[]'::jsonb; v_found boolean := false;
BEGIN
  IF NEW.content IS NULL OR jsonb_typeof(NEW.content->'questions') <> 'array' THEN RETURN NEW; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(NEW.content->'questions') LOOP
    IF q ? 'correct_index' THEN
      v_found := true;
      v_keys := v_keys || jsonb_build_object(q->>'id', jsonb_build_object('correct_index', (q->>'correct_index')::int, 'explanation', q->'explanation'));
    END IF;
    v_clean := v_clean || jsonb_build_array(q - 'correct_index' - 'explanation');
  END LOOP;
  IF v_found THEN
    INSERT INTO lesson_quiz_keys(lesson_id, answers) VALUES (NEW.id, v_keys)
    ON CONFLICT (lesson_id) DO UPDATE SET answers = lesson_quiz_keys.answers || EXCLUDED.answers, updated_at = now();
    NEW.content := jsonb_set(NEW.content, '{questions}', v_clean);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER lessons_extract_quiz_keys BEFORE INSERT OR UPDATE OF content ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.extract_lesson_quiz_keys();

UPDATE public.lessons SET content = content WHERE content->'questions' @> '[{}]' AND content::text LIKE '%correct_index%';

-- Learners may not complete quiz lessons directly
CREATE OR REPLACE FUNCTION public.guard_quiz_lesson_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_setting('app.lesson_grading', true),'') = 'on' THEN RETURN NEW; END IF;
  IF COALESCE(auth.role(),'') <> 'authenticated' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM lesson_quiz_keys k WHERE k.lesson_id = NEW.lesson_id) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'completed' OR COALESCE(NEW.xp_earned,0) > 0 OR NEW.score IS NOT NULL THEN
        RAISE EXCEPTION 'Quiz results are recorded by the server';
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.score IS DISTINCT FROM OLD.score
       OR NEW.xp_earned IS DISTINCT FROM OLD.xp_earned OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Quiz results are recorded by the server';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER user_lesson_progress_quiz_guard BEFORE INSERT OR UPDATE ON public.user_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_lesson_progress();

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(p_lesson_id uuid, p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Reveal correct answers only on a pass, so retries can't be answered from the key
  IF NOT v_passed THEN
    SELECT COALESCE(jsonb_agg(r - 'correct_index'), '[]'::jsonb) INTO v_results FROM jsonb_array_elements(v_results) r;
  END IF;

  RETURN jsonb_build_object('correct', v_correct, 'total', v_total, 'pct', v_pct, 'passed', v_passed, 'xpEarned', v_xp, 'results', v_results);
END $$;

REVOKE ALL ON FUNCTION public.submit_lesson_quiz(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.extract_lesson_quiz_keys() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_quiz_lesson_progress() FROM PUBLIC, anon, authenticated;