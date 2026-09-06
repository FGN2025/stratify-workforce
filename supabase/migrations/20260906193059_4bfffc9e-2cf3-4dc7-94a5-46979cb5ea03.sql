-- Safe public views for anonymous marketing pages
CREATE OR REPLACE VIEW public.public_communities
WITH (security_barrier = true) AS
SELECT id, name, slug, description, logo_url, cover_image_url, brand_color,
       website_url, location, member_count, is_verified, category_type, created_at
FROM public.tenants
WHERE approval_status = 'approved';
GRANT SELECT ON public.public_communities TO anon;
GRANT SELECT ON public.public_communities TO authenticated;
GRANT SELECT ON public.public_communities TO service_role;

CREATE OR REPLACE VIEW public.public_work_orders
WITH (security_barrier = true) AS
SELECT id, tenant_id, title, generated_name, description, game_title,
       is_active, created_at, xp_reward, difficulty, cover_image_url
FROM public.work_orders
WHERE is_active = true AND public.is_work_order_visible(auth.uid(), id);
GRANT SELECT ON public.public_work_orders TO anon;
GRANT SELECT ON public.public_work_orders TO authenticated;
GRANT SELECT ON public.public_work_orders TO service_role;

CREATE OR REPLACE VIEW public.public_lesson_outlines
WITH (security_barrier = true) AS
SELECT l.id, l.module_id, m.course_id, l.title, l.lesson_type, l.xp_reward, l.order_index
FROM public.lessons l
JOIN public.modules m ON m.id = l.module_id
JOIN public.courses c ON c.id = m.course_id
WHERE c.is_published = true;
GRANT SELECT ON public.public_lesson_outlines TO anon;
GRANT SELECT ON public.public_lesson_outlines TO authenticated;
GRANT SELECT ON public.public_lesson_outlines TO service_role;

-- Restrict base tables to signed-in users (anon now reads via the views above)
ALTER POLICY "View approved or own communities" ON public.tenants TO authenticated;
ALTER POLICY "Work orders visible via curation" ON public.work_orders TO authenticated;
ALTER POLICY "Lessons of published courses are viewable by everyone" ON public.lessons TO authenticated;
ALTER POLICY "tier2_lessons_require_construction_foundation" ON public.lessons TO authenticated;
ALTER POLICY "Channel posts are viewable by everyone" ON public.channel_posts TO authenticated;