
-- 1. Fix registration_codes: replace public SELECT with authenticated-only + validation RPC
DROP POLICY IF EXISTS "Anyone can validate codes" ON public.registration_codes;

CREATE POLICY "Authenticated users can view codes"
  ON public.registration_codes FOR SELECT TO authenticated
  USING (true);

-- Create a secure validation function for unauthenticated code checks during onboarding
CREATE OR REPLACE FUNCTION public.validate_registration_code(p_code text)
RETURNS TABLE(
  id uuid,
  code text,
  tenant_id uuid,
  tenant_name text,
  is_valid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id,
    rc.code,
    rc.tenant_id,
    t.name AS tenant_name,
    (rc.is_active
      AND (rc.expires_at IS NULL OR rc.expires_at > now())
      AND (rc.max_uses IS NULL OR rc.current_uses < rc.max_uses)
    ) AS is_valid
  FROM registration_codes rc
  LEFT JOIN tenants t ON t.id = rc.tenant_id
  WHERE LOWER(rc.code) = LOWER(p_code)
  LIMIT 1;
$$;

-- 2. Fix privilege escalation: add request_status = 'approved' to tenant role functions
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.request_status = 'approved'
      AND cm.role IN ('admin'::community_membership_role, 'owner'::community_membership_role)
      AND (
        cm.tenant_id = p_tenant_id
        OR cm.tenant_id IN (SELECT get_parent_tenants(p_tenant_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_user_id uuid, p_tenant_id uuid, p_role community_membership_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.request_status = 'approved'
      AND cm.role = p_role
      AND (
        cm.tenant_id = p_tenant_id
        OR cm.tenant_id IN (SELECT get_parent_tenants(p_tenant_id))
      )
  )
$$;

-- 3. Fix event_registrations: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view event registrations" ON public.event_registrations;

CREATE POLICY "Authenticated users can view event registrations"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_registrations.event_id
      AND e.status <> 'draft'
    )
  );

-- 4. Fix storage: make media-assets private and add scoped public read
UPDATE storage.buckets SET public = false WHERE id = 'media-assets';

DROP POLICY IF EXISTS "Media assets are publicly accessible" ON storage.objects;

CREATE POLICY "Public media folders readable"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'media-assets'
    AND (storage.foldername(name))[1] IN ('cards', 'general', 'covers', 'logos', 'banners', 'avatars')
  );

-- Authenticated users can read all non-evidence media
CREATE POLICY "Authenticated users can read media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media-assets'
    AND (
      (storage.foldername(name))[1] <> 'evidence-submissions'
      OR (storage.foldername(name))[1] IS NULL
    )
  );
