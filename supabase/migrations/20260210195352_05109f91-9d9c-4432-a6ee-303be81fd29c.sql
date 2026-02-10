
-- Add api_key_encrypted column to ai_model_configs
ALTER TABLE public.ai_model_configs
ADD COLUMN api_key_encrypted text;

-- Insert open_notebook_api_key setting
INSERT INTO public.ai_platform_settings (key, value)
VALUES ('open_notebook_api_key', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
