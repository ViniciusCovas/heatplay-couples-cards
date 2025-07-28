-- First, let's check if app_role enum exists and create it if needed
DO $$ 
BEGIN
    -- Create the enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Now update the functions with search_path (only the ones that need it)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE profiles.user_id = $1;
  
  RETURN COALESCE(user_role, 'user'::app_role);
END;
$function$;