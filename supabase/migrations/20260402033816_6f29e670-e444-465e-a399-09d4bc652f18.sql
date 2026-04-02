-- Create work order assignments table
CREATE TABLE public.work_order_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id UUID DEFAULT NULL, -- NULL = community-wide, set = specific member
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(tenant_id, work_order_id, user_id)
);

-- Index for quick lookups
CREATE INDEX idx_woa_tenant ON public.work_order_assignments(tenant_id);
CREATE INDEX idx_woa_user ON public.work_order_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_woa_work_order ON public.work_order_assignments(work_order_id);

-- Enable RLS
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything
CREATE POLICY "Admins can manage all assignments"
  ON public.work_order_assignments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Community managers/admins/owners can manage assignments for their community
CREATE POLICY "Community managers can manage assignments"
  ON public.work_order_assignments
  FOR ALL
  TO authenticated
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'manager'::community_membership_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'admin'::community_membership_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'owner'::community_membership_role)
  );

-- Members can view community-wide assignments in their community
CREATE POLICY "Members can view community assignments"
  ON public.work_order_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM community_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.tenant_id = work_order_assignments.tenant_id
        AND cm.request_status = 'approved'
    )
  );

-- Users can view their own personal assignments
CREATE POLICY "Users can view own assignments"
  ON public.work_order_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());