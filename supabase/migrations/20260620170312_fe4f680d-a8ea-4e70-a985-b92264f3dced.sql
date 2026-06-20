
-- Restore full SELECT grant on public.simulation_items to authenticated so
-- admin REST reads (select=*) succeed. Row gating is handled by RLS — the
-- existing "Admins manage simulation items" policy (FOR ALL with has_role)
-- already covers admin SELECT.
GRANT SELECT ON public.simulation_items TO authenticated;

-- Keep service_role full access (already present, idempotent).
GRANT ALL ON public.simulation_items TO service_role;

-- Add an explicit admin SELECT policy in case the canonical convention in
-- this project is per-command policies. Coexists with "Admins manage ..."
-- (which is FOR ALL) without conflict. Non-admins still gated by the
-- existing column-restricted student policy.
DROP POLICY IF EXISTS "Admins can read simulation items" ON public.simulation_items;
CREATE POLICY "Admins can read simulation items"
  ON public.simulation_items
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- simulations parent: already authenticated-readable + admin-managed. No
-- change required to satisfy admin read-back of the header alongside items.
