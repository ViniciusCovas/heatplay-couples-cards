-- Fix the infinite recursion issue in profiles policies by creating a proper security definer function
-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create a security definer function to get user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE profiles.user_id = $1;
  
  RETURN COALESCE(user_role, 'user'::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple, non-recursive policies using the security definer function
CREATE POLICY "Users can view own profile, admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  public.get_user_role(auth.uid()) = 'admin'::app_role
);

CREATE POLICY "Users can update own profile, admins can update all" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  public.get_user_role(auth.uid()) = 'admin'::app_role
);

CREATE POLICY "Only admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin'::app_role
);

CREATE POLICY "Only admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) = 'admin'::app_role
);

-- Ensure viniciuscovas@gmail.com is promoted to admin
SELECT public.promote_to_admin('viniciuscovas@gmail.com');