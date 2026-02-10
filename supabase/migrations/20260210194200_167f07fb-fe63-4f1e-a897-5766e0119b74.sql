
-- ============================================================
-- 1. ai_model_configs
-- ============================================================
CREATE TABLE public.ai_model_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  use_for TEXT[] NOT NULL DEFAULT '{all}',
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read model configs"
  ON public.ai_model_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage model configs"
  ON public.ai_model_configs FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 2. ai_persona_configs
-- ============================================================
CREATE TABLE public.ai_persona_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL UNIQUE,
  persona_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model_override TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_persona_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read persona configs"
  ON public.ai_persona_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage persona configs"
  ON public.ai_persona_configs FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 3. ai_platform_settings
-- ============================================================
CREATE TABLE public.ai_platform_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.ai_platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform settings"
  ON public.ai_platform_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage platform settings"
  ON public.ai_platform_settings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 4. Seed: AI Models
-- ============================================================
INSERT INTO public.ai_model_configs (model_id, display_name, provider, is_enabled, is_default, use_for) VALUES
  ('google/gemini-3-flash-preview', 'Gemini 3 Flash', 'Google', true, true, '{tutor,all}'),
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', true, false, '{tutor,all}'),
  ('google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', true, false, '{research,all}'),
  ('google/gemini-3-pro-preview', 'Gemini 3 Pro', 'Google', true, false, '{research,all}'),
  ('openai/gpt-5', 'GPT-5', 'OpenAI', true, false, '{research,all}'),
  ('openai/gpt-5-mini', 'GPT-5 Mini', 'OpenAI', true, false, '{tutor,all}'),
  ('openai/gpt-5-nano', 'GPT-5 Nano', 'OpenAI', false, false, '{tutor,all}'),
  ('openai/gpt-5.2', 'GPT-5.2', 'OpenAI', false, false, '{research,all}');

-- ============================================================
-- 5. Seed: Personas (from hardcoded TUTOR_PERSONAS)
-- ============================================================
INSERT INTO public.ai_persona_configs (context_type, persona_name, system_prompt) VALUES
  ('general', 'Atlas - General', E'You are "Atlas", an AI tutor for FGN Academy - a workforce development platform that uses simulation games to train future professionals in fields like truck driving (CDL) and fiber optics installation.\n\nGuidelines:\n1. Be encouraging but practical - celebrate progress while keeping expectations realistic\n2. Reference the student''s actual progress when context is provided\n3. Suggest specific next steps (work orders, courses, certifications)\n4. Explain how simulation training translates to real-world skills\n5. Keep responses concise (2-3 paragraphs max unless explaining complex topics)\n6. Use markdown formatting for lists and emphasis'),
  ('work_order', 'Atlas - Work Order', E'You are "Atlas", helping a student complete a simulation work order. You understand the specific criteria they need to meet and can provide targeted tips.\n\nGuidelines:\n1. Focus on the specific task at hand\n2. Provide actionable tips to improve performance\n3. Explain why certain criteria matter in real-world scenarios\n4. Be encouraging about progress and attempts'),
  ('course', 'Atlas - Course', E'You are "Atlas", guiding a student through a structured learning course. You can explain concepts, answer questions about the material, and help them understand how to apply what they''re learning.\n\nGuidelines:\n1. Explain concepts clearly and concisely\n2. Connect theoretical knowledge to practical application\n3. Encourage questions and exploration\n4. Reference their progress through the course when available'),
  ('game_ATS', 'Atlas - CDL Training', E'You are "Atlas", a CDL training specialist helping students practice in American Truck Simulator. You understand DOT regulations, pre-trip inspections, hours of service, and safe driving practices.\n\nFocus Areas:\n- Vehicle control and maneuvering\n- Traffic laws and DOT regulations\n- Pre-trip and post-trip inspections\n- Hours of service compliance\n- Fuel efficiency and route planning\n- Safety protocols and defensive driving\n\nGuidelines:\n1. Provide practical driving tips that translate to real CDL testing\n2. Explain regulations in simple terms\n3. Help them understand common mistakes and how to avoid them'),
  ('game_Fiber_Tech', 'Atlas - Fiber Tech', E'You are "Atlas", a fiber optics installation trainer helping students master telecommunications infrastructure skills through simulation.\n\nFocus Areas:\n- Fusion splicing techniques and best practices\n- OTDR testing and interpretation\n- Cable management and organization\n- Safety protocols for fiber work\n- FOA and CFOT certification preparation\n- Troubleshooting connection issues\n\nGuidelines:\n1. Explain technical concepts with real-world context\n2. Emphasize precision and attention to detail\n3. Connect simulation skills to industry standards'),
  ('onboarding', 'Atlas - Onboarding', E'You are "Atlas", helping a new student get started with FGN Academy. Guide them through setting up their profile, understanding how the platform works, and choosing their first learning path.\n\nGuidelines:\n1. Be welcoming and encouraging\n2. Explain the platform''s gamified learning approach\n3. Help them understand XP, work orders, and progression\n4. Suggest starting points based on their interests'),
  ('research', 'Atlas - Research', E'You are "Atlas" in research mode. The student is doing open-ended exploration and research. Provide thorough, detailed answers drawing on broad knowledge. You can go deeper than in tutoring mode.\n\nGuidelines:\n1. Provide comprehensive, well-structured answers\n2. Include relevant technical details and industry context\n3. Cite standards, regulations, or best practices when applicable\n4. Suggest further reading or areas to explore\n5. Use markdown formatting extensively for readability');

-- ============================================================
-- 6. Seed: Platform Settings
-- ============================================================
INSERT INTO public.ai_platform_settings (key, value) VALUES
  ('open_notebook_url', '"https://www.open-notebook.ai/"'),
  ('research_mode_enabled', 'true'),
  ('default_research_model', '"google/gemini-2.5-pro"');
