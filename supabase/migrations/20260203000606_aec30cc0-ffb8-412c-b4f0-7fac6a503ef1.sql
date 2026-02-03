-- Phase 3: Update has_role function to include developer in super_admin inheritance
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'super_admin' AND _role IN ('admin', 'moderator', 'developer'))
        OR (role = 'admin' AND _role = 'moderator')
      )
  )
$$;

-- Phase 4: Drop existing authorized_apps policies
DROP POLICY IF EXISTS "Admins can view authorized apps" ON public.authorized_apps;
DROP POLICY IF EXISTS "Super admins can manage authorized apps" ON public.authorized_apps;

-- Phase 5: Create new RLS policies for authorized_apps
-- Developers can view their own apps
CREATE POLICY "Developers can view their own apps"
ON public.authorized_apps
FOR SELECT
USING (owner_id = auth.uid());

-- Developers can insert their own apps
CREATE POLICY "Developers can insert their own apps"
ON public.authorized_apps
FOR INSERT
WITH CHECK (owner_id = auth.uid() AND has_role(auth.uid(), 'developer'));

-- Developers can update their own apps
CREATE POLICY "Developers can update their own apps"
ON public.authorized_apps
FOR UPDATE
USING (owner_id = auth.uid() AND has_role(auth.uid(), 'developer'));

-- Developers can delete their own apps
CREATE POLICY "Developers can delete their own apps"
ON public.authorized_apps
FOR DELETE
USING (owner_id = auth.uid() AND has_role(auth.uid(), 'developer'));

-- Admins can view all apps (read-only)
CREATE POLICY "Admins can view all authorized apps"
ON public.authorized_apps
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Super admins can manage all authorized apps
CREATE POLICY "Super admins can manage all authorized apps"
ON public.authorized_apps
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));