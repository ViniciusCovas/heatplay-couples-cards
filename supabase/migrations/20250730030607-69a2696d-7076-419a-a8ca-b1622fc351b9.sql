-- Create the app_role enum type first
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Now update the functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE profiles.user_id = $1;
  
  RETURN COALESCE(user_role, 'user'::public.app_role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::public.app_role);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 AND role = 'admin'::public.app_role
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin'::public.app_role 
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$function$;