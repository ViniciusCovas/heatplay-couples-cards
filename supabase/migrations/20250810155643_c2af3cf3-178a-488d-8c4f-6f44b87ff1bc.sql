-- Fix room_participants RLS policy - remove infinite recursion completely
-- The current policy still has the recursive EXISTS clause which causes the infinite recursion

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.room_participants;

-- Create a truly simple SELECT policy without any recursion
CREATE POLICY "Users can view participants in their rooms" 
ON public.room_participants 
FOR SELECT 
USING (
  -- Users can only see their own participation records
  player_id = (auth.uid())::text
);

-- Ensure the INSERT policy is correct for room_participants
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;

CREATE POLICY "Users can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (
  -- Users can only insert themselves as participants
  player_id = (auth.uid())::text
);