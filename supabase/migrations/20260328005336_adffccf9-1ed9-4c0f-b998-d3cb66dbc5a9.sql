-- Drop the overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read model configs" ON ai_model_configs;

-- Create a safe public view that excludes sensitive columns
CREATE OR REPLACE VIEW public.ai_model_configs_safe AS
  SELECT id, model_id, display_name, provider, use_for, is_enabled, is_default, max_tokens, created_at, updated_at,
    CASE WHEN api_key_encrypted IS NOT NULL THEN true ELSE false END AS has_api_key
  FROM ai_model_configs;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.ai_model_configs_safe TO authenticated;

-- Add a restricted SELECT policy so only super_admins can read the full table (for admin UI mutations)
CREATE POLICY "Super admins can read model configs"
  ON ai_model_configs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));