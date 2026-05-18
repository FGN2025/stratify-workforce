
-- 1. ai_persona_configs: restrict read to admins
DROP POLICY IF EXISTS "Authenticated users can read persona configs" ON public.ai_persona_configs;
CREATE POLICY "Admins can read persona configs"
ON public.ai_persona_configs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. ai_platform_settings: restrict read to super_admins
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.ai_platform_settings;
CREATE POLICY "Super admins can read platform settings"
ON public.ai_platform_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. community_memberships: lock public-role policies to authenticated only
DROP POLICY IF EXISTS "Users can join communities" ON public.community_memberships;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.community_memberships;

CREATE POLICY "Users can join communities"
ON public.community_memberships
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave communities"
ON public.community_memberships
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all memberships"
ON public.community_memberships
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
