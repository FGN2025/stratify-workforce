
REVOKE ALL ON public.simulation_items FROM anon, authenticated;

GRANT SELECT (id, simulation_id, item_key, cat_key, icon, name, sub, display_order)
  ON public.simulation_items TO anon, authenticated;

-- Admins act through service_role / RPCs; no table-wide grant restored to authenticated.
GRANT ALL ON public.simulation_items TO service_role;
