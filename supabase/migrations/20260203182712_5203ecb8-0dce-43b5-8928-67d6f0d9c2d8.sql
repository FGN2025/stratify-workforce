-- Insert Fiber-Tech game channel
INSERT INTO public.game_channels (
  game_title,
  name,
  description,
  accent_color
) VALUES (
  'Fiber_Tech',
  'Fiber-Tech Simulator',
  'Master fiber optic installation, splicing, and testing through immersive simulation training. Build skills demanded by broadband providers and telecommunications employers.',
  '#8B5CF6'
);

-- Fiber-Tech skill categories aligned with industry certifications
INSERT INTO public.skills_taxonomy (game_title, skill_key, skill_name, category, description, sort_order) VALUES
  -- Safety Category
  ('Fiber_Tech', 'ladder_safety', 'Ladder & Height Safety', 'safety', 'Proper ladder setup, fall protection, and aerial work practices', 1),
  ('Fiber_Tech', 'ppe_compliance', 'PPE Compliance', 'safety', 'Correct use of safety glasses, gloves, and protective equipment', 2),
  ('Fiber_Tech', 'trench_safety', 'Trench & Excavation Safety', 'safety', 'Safe practices for underground fiber installation', 3),
  
  -- Precision Category
  ('Fiber_Tech', 'fiber_splicing', 'Fiber Splicing', 'precision', 'Fusion and mechanical splicing techniques for single and multi-mode fiber', 4),
  ('Fiber_Tech', 'connector_termination', 'Connector Termination', 'precision', 'Polishing and terminating fiber connectors to specification', 5),
  ('Fiber_Tech', 'cable_routing', 'Cable Routing & Management', 'precision', 'Proper bend radius, tie-down, and pathway management', 6),
  
  -- Efficiency Category
  ('Fiber_Tech', 'otdr_testing', 'OTDR Testing', 'efficiency', 'Operating optical time-domain reflectometer for fault detection', 7),
  ('Fiber_Tech', 'power_meter', 'Light Source & Power Meter', 'efficiency', 'End-to-end loss testing and verification', 8),
  ('Fiber_Tech', 'documentation', 'Field Documentation', 'efficiency', 'Accurate recording of installation data and as-builts', 9),
  
  -- Equipment Care Category
  ('Fiber_Tech', 'tool_maintenance', 'Tool Maintenance', 'equipment_care', 'Proper cleaning and care of splicing equipment and cleavers', 10),
  ('Fiber_Tech', 'fiber_handling', 'Fiber Handling', 'equipment_care', 'Correct handling to prevent microbends and contamination', 11),
  ('Fiber_Tech', 'vehicle_equipment', 'Vehicle & Equipment Care', 'equipment_care', 'Maintenance of service vehicles and mounted equipment', 12);