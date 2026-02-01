-- Drop the security_invoker view since it won't work for anonymous access
DROP VIEW IF EXISTS public.profiles_public;

-- Create a SECURITY DEFINER function that returns limited public profile data
-- This bypasses RLS but only exposes safe fields
CREATE OR REPLACE FUNCTION public.get_public_profile_data(profile_ids uuid[] DEFAULT NULL)
RETURNS TABLE(id uuid, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.avatar_url
  FROM profiles p
  WHERE (profile_ids IS NULL OR p.id = ANY(profile_ids));
$$;