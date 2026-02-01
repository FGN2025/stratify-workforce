-- Create user_addresses table for FGN Academy registration
CREATE TABLE public.user_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    full_name text NOT NULL,
    street_address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    discord_id text,
    is_validated boolean NOT NULL DEFAULT false,
    smarty_response jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast user lookups
CREATE INDEX idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own address
CREATE POLICY "Users can insert their own address"
ON public.user_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own address
CREATE POLICY "Users can view their own address"
ON public.user_addresses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own address
CREATE POLICY "Users can update their own address"
ON public.user_addresses
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses"
ON public.user_addresses
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_addresses_updated_at
BEFORE UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();