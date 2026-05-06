DROP POLICY IF EXISTS "Everyone can view community memberships" ON public.community_memberships;

DROP POLICY IF EXISTS "Authenticated users can view codes" ON public.registration_codes;
CREATE POLICY "Admins can view codes"
  ON public.registration_codes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Users can view all subscriptions" ON public.channel_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.channel_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view all achievements" ON public.user_achievements;
CREATE POLICY "Admins can view all achievements"
  ON public.user_achievements
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.can_view_profile(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    viewer_id = profile_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = viewer_id
      AND role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.tenant_id = p2.tenant_id
      WHERE p1.id = viewer_id AND p2.id = profile_id
      AND p1.tenant_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM community_memberships cm
      JOIN profiles p ON p.tenant_id = cm.tenant_id
      WHERE cm.user_id = viewer_id AND p.id = profile_id
      AND cm.request_status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM community_memberships cm
      JOIN profiles p ON p.tenant_id IN (SELECT get_child_tenants(cm.tenant_id))
      WHERE cm.user_id = viewer_id AND p.id = profile_id
      AND cm.request_status = 'approved'
    )
$$;

ALTER FUNCTION public.generate_source_challenge_id() SET search_path = public;
ALTER FUNCTION public.set_scorm_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_user_game_stats_timestamp() SET search_path = public;