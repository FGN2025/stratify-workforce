-- Create a public view for leaderboard widgets with only safe fields
CREATE VIEW public.profiles_public AS
SELECT id, username, avatar_url
FROM public.profiles;

-- Grant SELECT access to anonymous and authenticated users
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;