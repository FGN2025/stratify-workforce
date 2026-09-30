REVOKE SELECT ON public.programs FROM anon;
REVOKE SELECT ON public.program_games FROM anon;
REVOKE SELECT ON public.program_pathways FROM anon;
DROP POLICY "Visible programs readable" ON public.programs;
CREATE POLICY "Visible programs readable" ON public.programs FOR SELECT TO authenticated
  USING (availability IN ('live','preview','coming_soon') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY "Program games readable" ON public.program_games;
CREATE POLICY "Program games readable" ON public.program_games FOR SELECT TO authenticated USING (true);
DROP POLICY "Program pathways readable" ON public.program_pathways;
CREATE POLICY "Program pathways readable" ON public.program_pathways FOR SELECT TO authenticated USING (true);