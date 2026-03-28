
-- Career path requirements table
CREATE TABLE public.career_path_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id text NOT NULL,
  credential_match_type text NOT NULL,
  match_value text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  display_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_path_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view career path requirements"
  ON public.career_path_requirements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage career path requirements"
  ON public.career_path_requirements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed data: 5 career paths x 4 requirements each
INSERT INTO public.career_path_requirements (career_path_id, credential_match_type, match_value, display_label, sort_order) VALUES
  ('cdl-class-a', 'title_contains', 'CDL Permit', 'CDL Permit Knowledge', 1),
  ('cdl-class-a', 'title_contains', 'Pre-Trip', 'Pre-Trip Inspection', 2),
  ('cdl-class-a', 'title_contains', 'Vehicle Control', 'Vehicle Control Skills', 3),
  ('cdl-class-a', 'title_contains', 'Road Safety', 'Road Safety Fundamentals', 4),

  ('fiber-technician', 'title_contains', 'Fiber Safety', 'Fiber Safety Certification', 1),
  ('fiber-technician', 'title_contains', 'Splicing', 'Splicing Fundamentals', 2),
  ('fiber-technician', 'title_contains', 'OTDR', 'OTDR Testing', 3),
  ('fiber-technician', 'title_contains', 'Aerial', 'Aerial Installation', 4),

  ('heavy-equipment-operator', 'title_contains', 'Equipment Safety', 'Equipment Safety', 1),
  ('heavy-equipment-operator', 'title_contains', 'Excavation', 'Excavation Fundamentals', 2),
  ('heavy-equipment-operator', 'title_contains', 'Grade Reading', 'Grade Reading', 3),
  ('heavy-equipment-operator', 'title_contains', 'Load Calculation', 'Load Calculations', 4),

  ('ag-equipment-tech', 'title_contains', 'Precision Agriculture', 'Precision Agriculture', 1),
  ('ag-equipment-tech', 'title_contains', 'Equipment Maintenance', 'Equipment Maintenance', 2),
  ('ag-equipment-tech', 'title_contains', 'GPS', 'GPS & Guidance Systems', 3),
  ('ag-equipment-tech', 'title_contains', 'Harvest', 'Harvest Operations', 4),

  ('diesel-mechanic', 'title_contains', 'Diesel', 'Diesel Fundamentals', 1),
  ('diesel-mechanic', 'title_contains', 'Diagnostic', 'Diagnostic Systems', 2),
  ('diesel-mechanic', 'title_contains', 'Brake', 'Brake Systems', 3),
  ('diesel-mechanic', 'title_contains', 'Electrical', 'Electrical Systems', 4);

-- Calculate readiness RPC function
CREATE OR REPLACE FUNCTION public.calculate_readiness(p_user_id uuid, p_career_path_id text DEFAULT NULL)
RETURNS TABLE(career_path_id text, matched_count bigint, total_count bigint, readiness_pct integer, matched_labels text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_creds AS (
    SELECT sc.title, sc.game_title, sc.skills_verified
    FROM skill_credentials sc
    JOIN skill_passport sp ON sp.id = sc.passport_id
    WHERE sp.user_id = p_user_id
  ),
  req_matches AS (
    SELECT
      r.career_path_id,
      r.display_label,
      CASE
        WHEN r.credential_match_type = 'title_contains' THEN
          EXISTS (SELECT 1 FROM user_creds uc WHERE uc.title ILIKE '%' || r.match_value || '%')
        WHEN r.credential_match_type = 'game_title' THEN
          EXISTS (SELECT 1 FROM user_creds uc WHERE uc.game_title::text = r.match_value)
        WHEN r.credential_match_type = 'skill_verified' THEN
          EXISTS (SELECT 1 FROM user_creds uc WHERE r.match_value = ANY(uc.skills_verified))
        ELSE false
      END AS is_matched
    FROM career_path_requirements r
    WHERE (p_career_path_id IS NULL OR r.career_path_id = p_career_path_id)
  )
  SELECT
    rm.career_path_id,
    COUNT(*) FILTER (WHERE rm.is_matched) AS matched_count,
    COUNT(*) AS total_count,
    CASE WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(ROUND(COUNT(*) FILTER (WHERE rm.is_matched) * 100.0 / COUNT(*))::integer, 100)
    END AS readiness_pct,
    ARRAY_AGG(rm.display_label) FILTER (WHERE rm.is_matched) AS matched_labels
  FROM req_matches rm
  GROUP BY rm.career_path_id;
$$;
