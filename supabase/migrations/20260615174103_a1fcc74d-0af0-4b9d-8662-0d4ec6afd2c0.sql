ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS cover_image_prompt text;

INSERT INTO public.ai_platform_settings (key, value)
VALUES
  ('cover_image_model', to_jsonb('google/gemini-3.1-flash-image-preview'::text)),
  ('cover_prompt_model', to_jsonb('google/gemini-3-flash-preview'::text))
ON CONFLICT (key) DO NOTHING;