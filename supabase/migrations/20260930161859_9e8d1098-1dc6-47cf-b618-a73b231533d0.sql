-- Stage A: award-flow separation, shadow mode, origin tracking

-- A1: tag credential records with their award flow
ALTER TABLE public.skill_credentials
  ADD COLUMN IF NOT EXISTS award_pathway text NOT NULL DEFAULT 'legacy_completion';

-- A1: enforce the flow — while Skill Verification is dormant, nothing tagged
-- evidence_model may mint a credential or XP entry.
CREATE OR REPLACE FUNCTION public.enforce_award_flow_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.award_pathway = 'evidence_model' THEN
    RAISE EXCEPTION 'award_pathway=evidence_model is disabled while Skill Verification is dormant (no credential or XP may be minted from partner evidence)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_flow_guard_user_points ON public.user_points;
CREATE TRIGGER trg_award_flow_guard_user_points
  BEFORE INSERT ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.enforce_award_flow_guard();

DROP TRIGGER IF EXISTS trg_award_flow_guard_skill_credentials ON public.skill_credentials;
CREATE TRIGGER trg_award_flow_guard_skill_credentials
  BEFORE INSERT ON public.skill_credentials
  FOR EACH ROW EXECUTE FUNCTION public.enforce_award_flow_guard();

-- A2: per-source shadow mode (records events, produces no learner outcomes)
ALTER TABLE public.learning_sources
  ADD COLUMN IF NOT EXISTS shadow_mode boolean NOT NULL DEFAULT false;

-- A3: origin tracking on completions so the outbound queue can skip events
-- that did not originate at the Academy
ALTER TABLE public.user_work_order_completions
  ADD COLUMN IF NOT EXISTS origin_site text NOT NULL DEFAULT 'academy';
ALTER TABLE public.user_work_order_completions
  ADD COLUMN IF NOT EXISTS causation_event_id text;

-- A3: outbound completion enqueue skips completions that arrived from
-- another site (prevents completions bouncing back to their origin).
CREATE OR REPLACE FUNCTION public.enqueue_play_outbound_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wo RECORD;
  v_email text;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  -- A3: never bounce an inbound completion back out to any site.
  IF NEW.origin_site IS DISTINCT FROM 'academy' THEN RETURN NEW; END IF;

  SELECT id, title, generated_name, game_title, fgn_origin_challenge_id, source_challenge_id, tenant_id
    INTO v_wo FROM public.work_orders WHERE id = NEW.work_order_id;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  INSERT INTO public.play_outbound_queue (event_type, user_id, work_order_id, payload, origin_site, causation_event_id)
  VALUES (
    'work_order.completed',
    NEW.user_id,
    NEW.work_order_id,
    jsonb_build_object(
      'completion_id', NEW.id,
      'user_email', v_email,
      'work_order_id', NEW.work_order_id,
      'work_order_title', COALESCE(v_wo.generated_name, v_wo.title),
      'challenge_id', COALESCE(v_wo.fgn_origin_challenge_id, v_wo.source_challenge_id),
      'game_title', v_wo.game_title,
      'tenant_id', v_wo.tenant_id,
      'score', NEW.score,
      'xp_awarded', NEW.xp_awarded,
      'attempt_number', NEW.attempt_number,
      'completed_at', COALESCE(NEW.completed_at, now())
    ),
    'academy',
    NEW.causation_event_id
  );

  RETURN NEW;
END;
$function$;

-- A3: task-progress outbound inherits the same origin discipline by checking
-- the linked completion when one exists.
CREATE OR REPLACE FUNCTION public.enqueue_play_outbound_task_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wo RECORD;
  v_email text;
  v_origin text;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_completed IS TRUE THEN RETURN NEW; END IF;

  -- A3: if the parent completion came from another site, do not bounce it out.
  SELECT c.origin_site INTO v_origin
  FROM public.user_work_order_completions c
  WHERE c.user_id = NEW.user_id AND c.work_order_id = NEW.work_order_id
  LIMIT 1;
  IF v_origin IS NOT NULL AND v_origin <> 'academy' THEN RETURN NEW; END IF;

  SELECT id, title, generated_name, game_title, fgn_origin_challenge_id, source_challenge_id
    INTO v_wo FROM public.work_orders WHERE id = NEW.work_order_id;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  INSERT INTO public.play_outbound_queue (event_type, user_id, work_order_id, payload, origin_site)
  VALUES (
    'work_order.task_completed',
    NEW.user_id,
    NEW.work_order_id,
    jsonb_build_object(
      'user_email', v_email,
      'work_order_id', NEW.work_order_id,
      'work_order_title', COALESCE(v_wo.generated_name, v_wo.title),
      'challenge_id', COALESCE(v_wo.fgn_origin_challenge_id, v_wo.source_challenge_id),
      'game_title', v_wo.game_title,
      'task_id', NEW.work_order_task_id,
      'completed_at', COALESCE(NEW.completed_at, now())
    ),
    'academy'
  );

  RETURN NEW;
END;
$function$;