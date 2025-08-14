-- Update RLS policies to allow anonymous users to read active levels and questions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view levels" ON public.levels;
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;

-- Create new policies that allow both authenticated and anonymous users to view active content
CREATE POLICY "Anyone can view active levels" 
ON public.levels 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active questions" 
ON public.questions 
FOR SELECT 
USING (is_active = true);

-- Keep admin policies intact
-- (The existing admin policies for managing levels and questions remain unchanged)