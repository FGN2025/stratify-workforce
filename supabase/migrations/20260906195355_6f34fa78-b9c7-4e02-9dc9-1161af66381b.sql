-- 1. Legacy public-bucket evidence paths: remove entirely
DROP POLICY IF EXISTS "Users can upload evidence to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete evidence files" ON storage.objects;

-- 2. simulation_items: hide the answer key via column-level privileges
REVOKE SELECT ON public.simulation_items FROM authenticated;
GRANT SELECT (id, simulation_id, item_key, cat_key, icon, name, sub, display_order, created_at)
  ON public.simulation_items TO authenticated;
GRANT ALL ON public.simulation_items TO service_role;

-- 3. Safe public projections: switch to SECURITY INVOKER and back them with
--    anon row policies + column-level grants (so anon only ever sees safe columns).
ALTER VIEW public.public_communities SET (security_invoker = true);
ALTER VIEW public.public_work_orders SET (security_invoker = true);
ALTER VIEW public.public_lesson_outlines SET (security_invoker = true);

DROP POLICY IF EXISTS "Anon can read approved community marketing fields" ON public.tenants;
CREATE POLICY "Anon can read approved community marketing fields"
  ON public.tenants FOR SELECT TO anon
  USING (approval_status = 'approved'::community_approval_status);
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (id, name, slug, description, logo_url, cover_image_url, brand_color,
              website_url, location, member_count, is_verified, category_type,
              created_at, approval_status)
  ON public.tenants TO anon;

DROP POLICY IF EXISTS "Anon can read active visible work order marketing fields" ON public.work_orders;
CREATE POLICY "Anon can read active visible work order marketing fields"
  ON public.work_orders FOR SELECT TO anon
  USING (is_active = true AND public.is_work_order_visible(auth.uid(), id));
REVOKE SELECT ON public.work_orders FROM anon;
GRANT SELECT (id, tenant_id, title, generated_name, description, game_title,
              is_active, created_at, xp_reward, difficulty, cover_image_url)
  ON public.work_orders TO anon;

DROP POLICY IF EXISTS "Anon can read lesson outlines of published courses" ON public.lessons;
CREATE POLICY "Anon can read lesson outlines of published courses"
  ON public.lessons FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id AND c.is_published = true
  ));
REVOKE SELECT ON public.lessons FROM anon;
GRANT SELECT (id, module_id, title, lesson_type, xp_reward, order_index)
  ON public.lessons TO anon;

GRANT SELECT ON public.public_communities TO anon, authenticated, service_role;
GRANT SELECT ON public.public_work_orders TO anon, authenticated, service_role;
GRANT SELECT ON public.public_lesson_outlines TO anon, authenticated, service_role;