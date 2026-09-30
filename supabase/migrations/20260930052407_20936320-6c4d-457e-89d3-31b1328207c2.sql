ALTER TABLE public.play_replay_queue ADD COLUMN IF NOT EXISTS source_slug text NOT NULL DEFAULT 'play';
CREATE INDEX IF NOT EXISTS play_replay_queue_status_email_idx ON public.play_replay_queue (status, email);

CREATE OR REPLACE FUNCTION public.enqueue_play_replay_on_signup()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.play_sync_attempts
    WHERE direction = 'inbound' AND action LIKE 'webhook:%'
      AND (response->>'reason') = 'unmapped_identity'
      AND lower(coalesce(response->>'email','')) = lower(NEW.email)
  ) THEN
    INSERT INTO public.play_replay_queue (reason, email, source_slug)
    VALUES ('unmapped_identity', lower(NEW.email), 'play');
  END IF;

  FOR r IN
    SELECT DISTINCT source_slug FROM public.learning_source_pull_attempts
    WHERE direction = 'inbound' AND status = 'unmapped'
      AND lower(coalesce(response->>'email','')) = lower(NEW.email)
  LOOP
    INSERT INTO public.play_replay_queue (reason, email, source_slug)
    VALUES ('unmapped_identity', lower(NEW.email), r.source_slug);
  END LOOP;

  RETURN NEW;
END;
$function$;