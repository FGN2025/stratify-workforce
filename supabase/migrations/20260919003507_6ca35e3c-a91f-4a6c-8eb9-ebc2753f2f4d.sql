DROP POLICY IF EXISTS "Users can view matches of visible events" ON public.event_matches;

CREATE POLICY "Users can view matches of visible events"
ON public.event_matches
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_matches.event_id
      AND e.status <> 'draft'::event_status
      AND public.is_event_visible(auth.uid(), e.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_matches.event_id
      AND e.tenant_id IS NOT NULL
      AND public.is_tenant_admin(auth.uid(), e.tenant_id)
  )
);