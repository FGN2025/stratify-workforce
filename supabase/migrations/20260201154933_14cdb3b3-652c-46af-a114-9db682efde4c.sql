-- Update darcy@fgn.gg's role from admin to super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'darcy@fgn.gg');

-- Update the trigger function to assign super_admin instead of admin for darcy@fgn.gg
CREATE OR REPLACE FUNCTION public.handle_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.email = 'darcy@fgn.gg' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  END IF;
  RETURN NEW;
END;
$function$;