-- Revert to security definer (safe because view excludes sensitive columns)
ALTER VIEW public.ai_model_configs_safe SET (security_invoker = off);

-- Create a security definer function instead for safe access
CREATE OR REPLACE FUNCTION public.get_ai_model_configs_safe()
RETURNS TABLE (
  id uuid,
  model_id text,
  display_name text,
  provider text,
  use_for text[],
  is_enabled boolean,
  is_default boolean,
  max_tokens integer,
  created_at timestamptz,
  updated_at timestamptz,
  has_api_key boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, model_id, display_name, provider, use_for, is_enabled, is_default, max_tokens, created_at, updated_at,
    (api_key_encrypted IS NOT NULL) AS has_api_key
  FROM ai_model_configs;
$$;

-- Drop the view since we'll use the function
DROP VIEW IF EXISTS public.ai_model_configs_safe;