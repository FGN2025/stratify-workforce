
-- P0: Play webhook replay queue + auto-enqueue triggers
CREATE TABLE IF NOT EXISTS public.play_replay_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason text NOT NULL CHECK (reason IN ('unmapped_identity','unmapped_challenge','manual')),
  email text,
  challenge_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed','skipped')),
  attempts_matched int,
  attempts_replayed int,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT play_replay_queue_target_chk CHECK (email IS NOT NULL OR challenge_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS play_replay_queue_pending_idx
  ON public.play_replay_queue (created_at)
  WHERE status = 'pending';

ALTER TABLE public.play_replay_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read play_replay_queue"
  ON public.play_replay_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: on new user signup, enqueue replay of any previously-failed
-- Play deliveries whose payload referenced this email.
CREATE OR REPLACE FUNCTION public.enqueue_play_replay_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.play_sync_attempts
    WHERE direction = 'inbound'
      AND action LIKE 'webhook:%'
      AND (response->>'reason') = 'unmapped_identity'
      AND lower(coalesce(response->>'email','')) = lower(NEW.email)
  ) THEN
    INSERT INTO public.play_replay_queue (reason, email)
    VALUES ('unmapped_identity', lower(NEW.email));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_play_replay_on_signup ON auth.users;
CREATE TRIGGER trg_enqueue_play_replay_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_play_replay_on_signup();

-- Trigger: when an admin maps a Play challenge to an Academy lesson, enqueue
-- replay of any previously-failed challenge.completed deliveries for that
-- challenge id (those marked "No work order found for challenge_id: ...").
CREATE OR REPLACE FUNCTION public.enqueue_play_replay_on_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.play_challenge_id IS NULL OR NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.play_sync_attempts
    WHERE action = 'webhook:challenge.completed'
      AND status = 'failed'
      AND coalesce(response->>'error','') ILIKE '%' || NEW.play_challenge_id || '%'
  ) THEN
    INSERT INTO public.play_replay_queue (reason, challenge_id)
    VALUES ('unmapped_challenge', NEW.play_challenge_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_play_replay_on_mapping ON public.challenge_lesson_mappings;
CREATE TRIGGER trg_enqueue_play_replay_on_mapping
  AFTER INSERT ON public.challenge_lesson_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_play_replay_on_mapping();
