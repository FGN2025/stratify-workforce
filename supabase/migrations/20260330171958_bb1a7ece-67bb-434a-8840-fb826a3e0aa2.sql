
-- Create career_paths lookup table
CREATE TABLE public.career_paths (
  id text PRIMARY KEY,
  min_readiness_pct integer NOT NULL DEFAULT 75,
  training_bridge_url text,
  training_bridge_label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;

-- Public SELECT
CREATE POLICY "Anyone can view career paths"
  ON public.career_paths FOR SELECT
  TO public
  USING (true);

-- Admin ALL
CREATE POLICY "Admins can manage career paths"
  ON public.career_paths FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed data
INSERT INTO public.career_paths (id, min_readiness_pct, training_bridge_url, training_bridge_label) VALUES
  ('cdl-class-a', 75, 'https://simu-cdl-path.lovable.app', 'CDL Quest Training'),
  ('fiber-technician', 75, 'https://broadbandworkforce.com', 'Broadband Workforce Courses'),
  ('heavy-equipment-operator', 75, NULL, NULL),
  ('ag-equipment-tech', 75, NULL, NULL),
  ('diesel-mechanic', 75, NULL, NULL);
