ALTER TABLE public.authorized_apps ADD COLUMN can_submit_courses boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.authorized_apps.can_submit_courses IS 'Allows this app to submit standalone courses via studio-submit (scope submissions:create:courses).';
ALTER TABLE public.studio_submissions ADD COLUMN submission_type text NOT NULL DEFAULT 'work_order';
COMMENT ON COLUMN public.studio_submissions.submission_type IS 'work_order (default) or course; course requires can_submit_courses on the issuing app.';