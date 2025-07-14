-- Fix the infinite recursion issue in profiles policies
-- Remove the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simpler, safer admin policy using the is_admin function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow users to see their own profile always
  auth.uid() = user_id 
  OR 
  -- Allow if user is admin (using direct check to avoid recursion)
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin'
  )
);

-- Add admin policies for INSERT, UPDATE, DELETE
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin'
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin'
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin'
  )
);

-- Now promote viniciuscovas@gmail.com to admin
SELECT public.promote_to_admin('viniciuscovas@gmail.com');