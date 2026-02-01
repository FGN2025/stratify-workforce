-- Drop the view and recreate with security_invoker to respect RLS
DROP VIEW IF EXISTS public.profiles_public;

-- Create view with security_invoker = on (default in newer Postgres, but explicit is clearer)
-- This ensures the view uses the permissions of the querying user
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, username, avatar_url
FROM public.profiles;

-- Grant SELECT access to anonymous and authenticated users
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;