-- Insert a master admin user
-- Note: This is a placeholder - you'll need to sign up first, then update the role
-- The trigger will create the profile automatically when you sign up

-- After you sign up with admin@example.com, run this to make them admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- For now, let's create a function to easily promote users to admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;