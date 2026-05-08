
-- v0.2 multi-WO bundling — join table + lead-WO uniqueness swap + backfill

CREATE TABLE public.scorm_course_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.scorm_courses(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  is_lead boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scorm_course_work_orders_unique_pair UNIQUE (course_id, work_order_id)
);

COMMENT ON TABLE  public.scorm_course_work_orders IS 'v0.2 bundle membership; lead row mirrors scorm_courses.work_order_id';
COMMENT ON COLUMN public.scorm_course_work_orders.is_lead IS 'Exactly one true per course_id; mirrors scorm_courses.work_order_id';

-- Exactly one lead row per course
CREATE UNIQUE INDEX scorm_course_work_orders_one_lead_per_course
  ON public.scorm_course_work_orders (course_id)
  WHERE is_lead;

CREATE INDEX scorm_course_work_orders_course_idx ON public.scorm_course_work_orders (course_id, position);
CREATE INDEX scorm_course_work_orders_wo_idx     ON public.scorm_course_work_orders (work_order_id);

-- Swap single-WO uniqueness on scorm_courses for lead-WO+destination uniqueness
ALTER TABLE public.scorm_courses
  DROP CONSTRAINT IF EXISTS scorm_courses_work_order_id_destination_key;

ALTER TABLE public.scorm_courses
  ADD CONSTRAINT scorm_courses_lead_work_order_destination_unique
  UNIQUE (work_order_id, destination);

-- Backfill: one lead row per existing course
INSERT INTO public.scorm_course_work_orders (course_id, work_order_id, position, is_lead)
SELECT id, work_order_id, 0, true FROM public.scorm_courses;

-- RLS
ALTER TABLE public.scorm_course_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bundle membership"
  ON public.scorm_course_work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert bundle membership"
  ON public.scorm_course_work_orders FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bundle membership"
  ON public.scorm_course_work_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bundle membership"
  ON public.scorm_course_work_orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
