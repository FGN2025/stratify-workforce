
ALTER VIEW public.public_communities SET (security_invoker = true);

CREATE POLICY "Anon can read approved communities (safe columns only)"
  ON public.tenants FOR SELECT TO anon
  USING (approval_status = 'approved'::community_approval_status);

GRANT SELECT (id, name, slug, description, logo_url, cover_image_url, brand_color,
              website_url, location, member_count, is_verified, category_type, created_at)
  ON public.tenants TO anon;
