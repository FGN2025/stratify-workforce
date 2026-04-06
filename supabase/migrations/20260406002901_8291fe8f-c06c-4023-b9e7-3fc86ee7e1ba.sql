ALTER TABLE public.breakroom_identity
ADD CONSTRAINT breakroom_identity_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;