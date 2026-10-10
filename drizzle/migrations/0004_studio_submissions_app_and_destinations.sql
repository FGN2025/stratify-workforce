ALTER TABLE public.studio_submissions
  ADD COLUMN IF NOT EXISTS application_key text,
  ADD COLUMN IF NOT EXISTS destinations text[] NOT NULL DEFAULT '{fgn-academy}';
CREATE INDEX IF NOT EXISTS studio_submissions_application_key_idx ON public.studio_submissions(application_key);