CREATE OR REPLACE FUNCTION public.enqueue_replay_on_identity_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_slug text; v_email text;
BEGIN
  -- Proof of ownership required: an identity matched only by email does not
  -- trigger replay. play_identity rows are written only by the verified
  -- passport-link flow; learning_source_identity needs a partner-verified
  -- external id or an admin (manual) link.
  IF TG_TABLE_NAME = 'learning_source_identity' AND NEW.matched_via NOT IN ('external_id','manual') THEN
    RETURN NEW;
  END IF;
  v_slug := CASE WHEN TG_TABLE_NAME = 'play_identity' THEN 'play' ELSE NEW.source_slug END;
  v_email := lower(coalesce(NEW.email, (SELECT email FROM auth.users WHERE id = NEW.user_id)));
  IF v_email IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.learning_source_pull_attempts
    WHERE direction='inbound' AND status='unmapped' AND source_slug=v_slug
      AND lower(coalesce(response->>'email',''))=v_email
  ) OR (v_slug='play' AND EXISTS (
    SELECT 1 FROM public.play_sync_attempts
    WHERE direction='inbound' AND (response->>'reason')='unmapped_identity'
      AND lower(coalesce(response->>'email',''))=v_email
  )) THEN
    INSERT INTO public.play_replay_queue (reason, email, source_slug)
    VALUES ('identity_linked', v_email, v_slug);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enqueue_replay_on_identity_link() FROM PUBLIC, anon, authenticated;