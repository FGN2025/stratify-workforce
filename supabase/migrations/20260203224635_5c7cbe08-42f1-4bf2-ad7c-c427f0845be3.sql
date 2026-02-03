-- Create invitation status enum
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Create user_invitations table
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  username TEXT,
  role public.app_role NOT NULL DEFAULT 'user',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Only one pending invitation per email
  CONSTRAINT unique_pending_email UNIQUE (email) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create index for lookups
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert invitations
CREATE POLICY "Admins can create invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update invitations (revoke)
CREATE POLICY "Admins can update invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-assign role when user signs up
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Check for pending invitation matching the new user's email
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    -- Create user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_invitation.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update invitation status
    UPDATE public.user_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation.id;
    
    -- If tenant specified, update profile
    IF v_invitation.tenant_id IS NOT NULL THEN
      UPDATE public.profiles
      SET tenant_id = v_invitation.tenant_id
      WHERE id = NEW.id;
    END IF;
    
    -- Update profile username if suggested
    IF v_invitation.username IS NOT NULL THEN
      UPDATE public.profiles
      SET username = v_invitation.username
      WHERE id = NEW.id AND username IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user creation
CREATE TRIGGER on_auth_user_created_check_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_on_signup();