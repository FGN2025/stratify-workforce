-- Private registry of internal HTTP wake targets. Rows hold environment-specific
-- URLs/headers and are written by data operations, never committed to migrations.
CREATE TABLE IF NOT EXISTS public.internal_dispatch_targets (
  name text PRIMARY KEY,
  url text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_dispatch_targets TO service_role;
ALTER TABLE public.internal_dispatch_targets ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role and security-definer functions can read it.

CREATE OR REPLACE FUNCTION public.wake_play_replay_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE t record;
BEGIN
  SELECT url, headers INTO t FROM public.internal_dispatch_targets WHERE name = 'process-play-replay-queue';
  IF t.url IS NULL THEN RETURN NULL; END IF;
  BEGIN
    PERFORM net.http_post(
      url := t.url,
      body := jsonb_build_object('trigger', 'enqueue'),
      headers := t.headers
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup/identity-link/mapping writes because of a wake failure;
    -- the daily backstop drains anything left pending.
    RAISE WARNING 'wake_play_replay_queue failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.wake_play_replay_queue() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_wake_play_replay_queue ON public.play_replay_queue;
CREATE TRIGGER trg_wake_play_replay_queue
AFTER INSERT ON public.play_replay_queue
FOR EACH STATEMENT
EXECUTE FUNCTION public.wake_play_replay_queue();