-- Create system audit logs table for super_admin
CREATE TABLE public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.system_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Allow inserts from authenticated users (for logging their actions)
CREATE POLICY "System can insert audit logs"
ON public.system_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_created_at ON public.system_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.system_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON public.system_audit_logs(resource_type, resource_id);