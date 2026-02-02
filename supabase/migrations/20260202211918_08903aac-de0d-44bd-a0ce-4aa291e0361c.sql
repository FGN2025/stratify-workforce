-- Create skills_taxonomy table for standardized skill vocabulary
CREATE TABLE public.skills_taxonomy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_title public.game_title NOT NULL,
  skill_key TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT skills_taxonomy_unique_key UNIQUE (game_title, skill_key)
);

-- Enable RLS (public read, admin write)
ALTER TABLE public.skills_taxonomy ENABLE ROW LEVEL SECURITY;

-- Public read access for the catalog API
CREATE POLICY "Skills taxonomy is publicly readable"
  ON public.skills_taxonomy
  FOR SELECT
  USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage skills taxonomy"
  ON public.skills_taxonomy
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create index for game filtering
CREATE INDEX idx_skills_taxonomy_game ON public.skills_taxonomy(game_title);

-- Seed ATS CDL Skills
INSERT INTO public.skills_taxonomy (game_title, skill_key, skill_name, category, description, sort_order) VALUES
  -- Safety Category (1-3)
  ('ATS', 'pre_trip_inspection', 'Pre-Trip Inspection', 'safety', 'Ability to perform thorough vehicle inspections before departure', 1),
  ('ATS', 'defensive_driving', 'Defensive Driving', 'safety', 'Anticipating hazards and maintaining safe following distances', 2),
  ('ATS', 'hazmat_handling', 'Hazmat Handling', 'safety', 'Proper procedures for transporting hazardous materials', 3),
  
  -- Precision Category (4-6)
  ('ATS', 'backing_maneuvers', 'Backing Maneuvers', 'precision', 'Skill in reverse driving, straight-line and offset backing', 4),
  ('ATS', 'parallel_parking', 'Parallel Parking', 'precision', 'Ability to parallel park a commercial vehicle', 5),
  ('ATS', 'docking', 'Loading Dock Procedures', 'precision', 'Backing into loading docks and aligning with dock doors', 6),
  
  -- Efficiency Category (7-9)
  ('ATS', 'route_planning', 'Route Planning', 'efficiency', 'Selecting optimal routes considering distance, terrain, and restrictions', 7),
  ('ATS', 'fuel_management', 'Fuel Efficiency', 'efficiency', 'Driving techniques and habits that maximize fuel economy', 8),
  ('ATS', 'time_management', 'Schedule Adherence', 'efficiency', 'Meeting delivery deadlines while complying with HOS regulations', 9),
  
  -- Equipment Category (10-12)
  ('ATS', 'coupling_uncoupling', 'Coupling/Uncoupling', 'equipment', 'Safe procedures for connecting and disconnecting trailers', 10),
  ('ATS', 'brake_systems', 'Air Brake Systems', 'equipment', 'Understanding and operating air brake components', 11),
  ('ATS', 'cargo_securement', 'Cargo Securement', 'equipment', 'Properly securing loads to prevent shifting during transport', 12);