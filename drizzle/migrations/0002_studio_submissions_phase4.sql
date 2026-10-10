ALTER TABLE public.authorized_apps
  ADD COLUMN IF NOT EXISTS can_submit_packages boolean NOT NULL DEFAULT false;

CREATE TABLE public.studio_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.authorized_apps(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  idempotency_key text NOT NULL,
  title text NOT NULL,
  description text,
  scorm_version text NOT NULL DEFAULT '1.2',
  package_path text NOT NULL,
  package_size_bytes bigint,
  manifest_summary jsonb,
  source_work_order_ids uuid[] NOT NULL DEFAULT '{}',
  request_work_order_creation boolean NOT NULL DEFAULT false,
  validation_status text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'valid', 'validation_failed')),
  validation_errors jsonb,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  scorm_course_id uuid REFERENCES public.scorm_courses(id) ON DELETE SET NULL,
  generated_work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, idempotency_key)
);

CREATE INDEX studio_submissions_review_idx ON public.studio_submissions (review_status, created_at);

GRANT SELECT, UPDATE ON public.studio_submissions TO authenticated;
GRANT ALL ON public.studio_submissions TO service_role;

ALTER TABLE public.studio_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read studio submissions"
  ON public.studio_submissions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can review studio submissions"
  ON public.studio_submissions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER studio_submissions_updated_at
  BEFORE UPDATE ON public.studio_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();