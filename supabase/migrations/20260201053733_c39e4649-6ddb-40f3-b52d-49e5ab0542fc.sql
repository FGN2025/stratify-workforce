-- Add RLS policies for admin access to profiles (for user management)
-- Admins already can view all profiles through existing policy, but let's ensure it's explicit

-- Add admin policies for work_orders table (CRUD access)
CREATE POLICY "Admins can insert work orders"
ON public.work_orders FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update work orders"
ON public.work_orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete work orders"
ON public.work_orders FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for tenants table (CRUD access)
CREATE POLICY "Admins can insert tenants"
ON public.tenants FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tenants"
ON public.tenants FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tenants"
ON public.tenants FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to view all telemetry sessions (for analytics)
CREATE POLICY "Admins can view all sessions"
ON public.telemetry_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));