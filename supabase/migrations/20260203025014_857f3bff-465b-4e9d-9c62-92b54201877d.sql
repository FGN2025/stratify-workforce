-- Create membership request status enum
CREATE TYPE public.membership_request_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Add status columns to community_memberships table
ALTER TABLE public.community_memberships
ADD COLUMN request_status public.membership_request_status NOT NULL DEFAULT 'approved',
ADD COLUMN requested_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN reviewed_by UUID DEFAULT NULL,
ADD COLUMN reviewed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN reviewer_notes TEXT DEFAULT NULL;

-- Drop existing policies on community_memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.community_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their tenant" ON public.community_memberships;
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.community_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.community_memberships;

-- Users can view their own memberships (any status)
CREATE POLICY "Users can view own memberships"
ON public.community_memberships FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Approved members can view other approved members in their community
CREATE POLICY "Members can view approved members in community"
ON public.community_memberships FOR SELECT
TO authenticated
USING (
  request_status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.community_memberships cm
    WHERE cm.user_id = auth.uid()
    AND cm.tenant_id = community_memberships.tenant_id
    AND cm.request_status = 'approved'
  )
);

-- Community managers/admins/owners can view all memberships (including pending)
CREATE POLICY "Managers can view all memberships in community"
ON public.community_memberships FOR SELECT
TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, 'manager')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'owner')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Users can request membership (insert as pending with role='member')
CREATE POLICY "Users can request membership"
ON public.community_memberships FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND request_status = 'pending'
  AND role = 'member'
);

-- Community managers/admins/owners can update memberships (for approval)
CREATE POLICY "Managers can approve memberships"
ON public.community_memberships FOR UPDATE
TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, 'manager')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'owner')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Community managers/admins/owners can delete memberships
CREATE POLICY "Managers can delete memberships"
ON public.community_memberships FOR DELETE
TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, 'manager')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'owner')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Users can delete their own pending requests (cancel request)
CREATE POLICY "Users can cancel own pending requests"
ON public.community_memberships FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND request_status = 'pending'
);