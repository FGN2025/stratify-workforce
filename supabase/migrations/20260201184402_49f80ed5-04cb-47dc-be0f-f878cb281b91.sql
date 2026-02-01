-- Create registration_codes table for override codes
CREATE TABLE public.registration_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  description text,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index on code (case-insensitive)
CREATE UNIQUE INDEX registration_codes_code_unique ON public.registration_codes (LOWER(code));

-- Create index for lookups
CREATE INDEX registration_codes_is_active_idx ON public.registration_codes (is_active) WHERE is_active = true;

-- Add override_code_id and tenant_id to user_addresses
ALTER TABLE public.user_addresses 
  ADD COLUMN override_code_id uuid REFERENCES public.registration_codes(id) ON DELETE SET NULL,
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Enable RLS on registration_codes
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can select codes (for validation)
CREATE POLICY "Anyone can validate codes"
  ON public.registration_codes
  FOR SELECT
  USING (true);

-- Admins can insert codes
CREATE POLICY "Admins can insert codes"
  ON public.registration_codes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update codes
CREATE POLICY "Admins can update codes"
  ON public.registration_codes
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete codes
CREATE POLICY "Admins can delete codes"
  ON public.registration_codes
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to redeem a code (increment usage)
CREATE OR REPLACE FUNCTION public.redeem_registration_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  -- Find and update the code in one atomic operation
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1
  WHERE LOWER(code) = LOWER(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  RETURNING id INTO v_code_id;
  
  RETURN v_code_id;
END;
$$;