
-- 1) tenants: remove anonymous access to the base table; anon uses public_communities view
DROP POLICY IF EXISTS "Anon can read approved community marketing fields" ON public.tenants;
REVOKE ALL ON public.tenants FROM anon;
ALTER VIEW public.public_communities SET (security_invoker = false);
GRANT SELECT ON public.public_communities TO anon, authenticated;

-- 2) simulation_items: column-level restriction so answer keys are not readable by normal users
REVOKE ALL ON public.simulation_items FROM anon;
REVOKE ALL ON public.simulation_items FROM authenticated;
GRANT SELECT (id, simulation_id, item_key, cat_key, icon, name, sub, display_order, created_at, updated_at)
  ON public.simulation_items TO authenticated;
GRANT ALL ON public.simulation_items TO service_role;

DROP POLICY IF EXISTS "Admins manage simulation items" ON public.simulation_items;
CREATE POLICY "Admins manage simulation items"
  ON public.simulation_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) event_registrations: scope reads
DROP POLICY IF EXISTS "Authenticated users can view event registrations" ON public.event_registrations;
CREATE POLICY "Users and event admins can view registrations"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_registrations.event_id
        AND e.tenant_id IS NOT NULL
        AND is_tenant_admin(auth.uid(), e.tenant_id)
    )
  );
REVOKE ALL ON public.event_registrations FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;

-- Safe helpers for public-facing counts and participant lists
CREATE OR REPLACE FUNCTION public.get_event_registration_counts(p_event_ids uuid[])
RETURNS TABLE(event_id uuid, registration_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.event_id, count(*)::bigint
  FROM public.event_registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.event_id = ANY(p_event_ids)
    AND r.status = 'registered'
    AND e.status <> 'draft'
  GROUP BY r.event_id
$$;

CREATE OR REPLACE FUNCTION public.get_event_participants(p_event_id uuid)
RETURNS TABLE(user_id uuid, username text, avatar_url text, registered_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.user_id, p.username, p.avatar_url, r.registered_at
  FROM public.event_registrations r
  JOIN public.events e ON e.id = r.event_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.event_id = p_event_id
    AND r.status = 'registered'
    AND e.status <> 'draft'
  ORDER BY r.registered_at
$$;

GRANT EXECUTE ON FUNCTION public.get_event_registration_counts(uuid[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_event_participants(uuid) TO authenticated, anon;
