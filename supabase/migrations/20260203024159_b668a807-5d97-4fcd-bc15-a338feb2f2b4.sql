-- Create approval status enum for communities
CREATE TYPE public.community_approval_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_revision'
);

-- Add approval workflow columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN approval_status public.community_approval_status NOT NULL DEFAULT 'approved',
ADD COLUMN reviewed_by UUID DEFAULT NULL,
ADD COLUMN reviewed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN reviewer_notes TEXT DEFAULT NULL,
ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT now();

-- Drop existing policies that will be replaced
DROP POLICY IF EXISTS "Tenants are viewable by everyone" ON public.tenants;
DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;

-- Create new RLS policies for approval workflow

-- Anyone can view approved communities, users can view their own pending ones, admins see all
CREATE POLICY "View approved or own communities"
ON public.tenants FOR SELECT
USING (
  approval_status = 'approved'
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

-- Authenticated users can create communities (as pending, unless admin)
CREATE POLICY "Authenticated users can create communities"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can update their own pending/needs_revision communities
CREATE POLICY "Users can update own pending communities"
ON public.tenants FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() 
  AND approval_status IN ('pending', 'needs_revision')
);

-- Admins can update any community
CREATE POLICY "Admins can update any community"
ON public.tenants FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Super admins can update any community for approval
CREATE POLICY "Super admins can manage communities"
ON public.tenants FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));