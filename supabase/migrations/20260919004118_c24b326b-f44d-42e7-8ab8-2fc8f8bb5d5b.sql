CREATE TABLE public.play_outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  work_order_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_play_outbound_queue_status ON public.play_outbound_queue (status, created_at);

GRANT SELECT ON public.play_outbound_queue TO authenticated;
GRANT ALL ON public.play_outbound_queue TO service_role;

ALTER TABLE public.play_outbound_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outbound queue"
ON public.play_outbound_queue FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER play_outbound_queue_updated_at
BEFORE UPDATE ON public.play_outbound_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enqueue_play_outbound_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wo RECORD;
  v_email text;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT id, title, generated_name, game_title, fgn_origin_challenge_id, source_challenge_id, tenant_id
    INTO v_wo FROM public.work_orders WHERE id = NEW.work_order_id;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  INSERT INTO public.play_outbound_queue (event_type, user_id, work_order_id, payload)
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
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_play_outbound_completion
AFTER INSERT OR UPDATE ON public.user_work_order_completions
FOR EACH ROW EXECUTE FUNCTION public.enqueue_play_outbound_completion();

CREATE OR REPLACE FUNCTION public.enqueue_play_outbound_task_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wo RECORD;
  v_email text;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_completed IS TRUE THEN RETURN NEW; END IF;

  SELECT id, title, generated_name, game_title, fgn_origin_challenge_id, source_challenge_id
    INTO v_wo FROM public.work_orders WHERE id = NEW.work_order_id;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  INSERT INTO public.play_outbound_queue (event_type, user_id, work_order_id, payload)
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
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_play_outbound_task_progress
AFTER INSERT OR UPDATE ON public.user_task_progress
FOR EACH ROW EXECUTE FUNCTION public.enqueue_play_outbound_task_progress();