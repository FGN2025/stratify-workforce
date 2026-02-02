-- Create authorized_apps table for external app registration
CREATE TABLE public.authorized_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL,
  app_slug TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  can_read_credentials BOOLEAN NOT NULL DEFAULT false,
  can_issue_credentials BOOLEAN NOT NULL DEFAULT false,
  credential_types_allowed TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credential_types table for defining credential schemas
CREATE TABLE public.credential_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  issuer_app_slug TEXT REFERENCES public.authorized_apps(app_slug),
  game_title public.game_title,
  skills_granted TEXT[] NOT NULL DEFAULT '{}',
  icon_name TEXT NOT NULL DEFAULT 'award',
  accent_color TEXT NOT NULL DEFAULT '#10b981',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to skill_credentials table
ALTER TABLE public.skill_credentials 
ADD COLUMN IF NOT EXISTS issuer_app_slug TEXT REFERENCES public.authorized_apps(app_slug),
ADD COLUMN IF NOT EXISTS external_reference_id TEXT,
ADD COLUMN IF NOT EXISTS game_title public.game_title,
ADD COLUMN IF NOT EXISTS credential_type_key TEXT REFERENCES public.credential_types(type_key);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_skill_credentials_game_title ON public.skill_credentials(game_title);
CREATE INDEX IF NOT EXISTS idx_skill_credentials_credential_type ON public.skill_credentials(credential_type_key);
CREATE INDEX IF NOT EXISTS idx_credential_types_game_title ON public.credential_types(game_title);
CREATE INDEX IF NOT EXISTS idx_authorized_apps_slug ON public.authorized_apps(app_slug);

-- Enable RLS on new tables
ALTER TABLE public.authorized_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for authorized_apps (super_admin only for management)
CREATE POLICY "Super admins can manage authorized apps"
  ON public.authorized_apps
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view authorized apps"
  ON public.authorized_apps
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for credential_types
CREATE POLICY "Anyone can view active credential types"
  ON public.credential_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all credential types"
  ON public.credential_types
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can manage credential types"
  ON public.credential_types
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_authorized_apps_updated_at
  BEFORE UPDATE ON public.authorized_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credential_types_updated_at
  BEFORE UPDATE ON public.credential_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate API key (returns the raw key, stores hash)
CREATE OR REPLACE FUNCTION public.generate_app_api_key(p_app_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
BEGIN
  -- Generate a random 32-byte key encoded as hex
  v_raw_key := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Hash it for storage
  v_key_hash := encode(extensions.digest(v_raw_key::bytea, 'sha256'), 'hex');
  
  -- Update the app with the hashed key
  UPDATE public.authorized_apps
  SET api_key_hash = v_key_hash, updated_at = now()
  WHERE id = p_app_id;
  
  -- Return the raw key (only shown once)
  RETURN v_raw_key;
END;
$$;

-- Function to verify API key
CREATE OR REPLACE FUNCTION public.verify_app_api_key(p_api_key TEXT)
RETURNS TABLE(app_slug TEXT, can_read BOOLEAN, can_issue BOOLEAN, types_allowed TEXT[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    app_slug,
    can_read_credentials,
    can_issue_credentials,
    credential_types_allowed
  FROM public.authorized_apps
  WHERE api_key_hash = encode(extensions.digest(p_api_key::bytea, 'sha256'), 'hex')
    AND is_active = true;
$$;