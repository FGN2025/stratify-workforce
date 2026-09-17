-- user_badges
DROP POLICY IF EXISTS "Users can view all earned badges" ON public.user_badges;
CREATE POLICY "Users can view visible earned badges"
ON public.user_badges FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_view_profile(auth.uid(), user_id));

-- work_order_tasks
DROP POLICY IF EXISTS "Authenticated users can view work order tasks" ON public.work_order_tasks;
CREATE POLICY "Users can view tasks of visible work orders"
ON public.work_order_tasks FOR SELECT TO authenticated
USING (public.is_work_order_visible(auth.uid(), work_order_id));

-- challenge_track_membership
DROP POLICY IF EXISTS "Authenticated can view memberships" ON public.challenge_track_membership;
CREATE POLICY "Admins can view challenge track membership"
ON public.challenge_track_membership FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- scorm_course_work_orders
DROP POLICY IF EXISTS "Authenticated can view bundle membership" ON public.scorm_course_work_orders;
CREATE POLICY "Users can view bundle membership of visible work orders"
ON public.scorm_course_work_orders FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_work_order_visible(auth.uid(), work_order_id)
);

-- simulations
DROP POLICY IF EXISTS "Authenticated can read simulations" ON public.simulations;
CREATE POLICY "Users can read simulations of visible work orders"
ON public.simulations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (work_order_id IS NOT NULL AND public.is_work_order_visible(auth.uid(), work_order_id))
);

-- simulation_items
DROP POLICY IF EXISTS "Authenticated can read simulation items (column-restricted)" ON public.simulation_items;
CREATE POLICY "Users can read items of visible simulations"
ON public.simulation_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.simulations s
    WHERE s.id = simulation_items.simulation_id
      AND s.work_order_id IS NOT NULL
      AND public.is_work_order_visible(auth.uid(), s.work_order_id)
  )
);

-- channel_posts
DROP POLICY IF EXISTS "Channel posts are viewable by everyone" ON public.channel_posts;
CREATE POLICY "Authors and admins can view channel posts"
ON public.channel_posts FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- event_matches
DROP POLICY IF EXISTS "Anyone can view event matches" ON public.event_matches;
CREATE POLICY "Users can view matches of visible events"
ON public.event_matches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_matches.event_id
      AND e.status <> 'draft'::event_status
      AND public.is_event_visible(auth.uid(), e.id)
  )
);