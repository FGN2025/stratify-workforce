-- Passport magic-link tokens (Option B for Player Dashboard → Skill Passport deep link)
CREATE TABLE IF NOT EXISTS public.passport_link_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_user_id uuid,
  intent text NOT NULL DEFAULT 'view_passport',
  issued_to_app text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passport_link_tokens_expires
  ON public.passport_link_tokens(expires_at);

ALTER TABLE public.passport_link_tokens ENABLE ROW LEVEL SECURITY;

-- No client access; only edge functions (service role) read/write.
CREATE POLICY "Admins can read passport link tokens"
  ON public.passport_link_tokens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Purge helper (callable by edge function via service role; cron picks it up)
CREATE OR REPLACE FUNCTION public.purge_expired_passport_link_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.passport_link_tokens
   WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;