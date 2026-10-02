ALTER TABLE public.profiles ALTER COLUMN employability_score DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN skills DROP DEFAULT;
UPDATE public.profiles SET employability_score = NULL, skills = NULL
WHERE employability_score = 50
  AND skills = '{"speed":50,"safety":50,"precision":50,"efficiency":50,"equipment_care":50}'::jsonb;