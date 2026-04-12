
CREATE POLICY tech_cert_requires_technical_skills_badge
ON public.courses
FOR SELECT
USING (
  id <> 'c639fc10-4534-4779-b685-cffb20289f3f'
  OR
  EXISTS (
    SELECT 1
    FROM public.skill_credentials sc
    JOIN public.skill_passport sp ON sc.passport_id = sp.id
    WHERE sp.user_id = auth.uid()
    AND sc.credential_type = 'badge'
    AND sc.title = 'Technical Skills'
  )
);
