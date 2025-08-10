-- Fix room_participants RLS policy issue
-- The problem is that the policy is trying to call user_participates_in_room 
-- but that creates a chicken-and-egg problem when inserting the first participant

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.room_participants;

-- Create a simpler SELECT policy that doesn't cause recursion
CREATE POLICY "Users can view participants in their rooms" 
ON public.room_participants 
FOR SELECT 
USING (
  -- Users can see their own participation
  player_id = (auth.uid())::text 
  -- OR they can see participants in rooms where they already participate
  -- (using a subquery instead of the function to avoid recursion)
  OR EXISTS (
    SELECT 1 FROM public.room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id 
    AND rp2.player_id = (auth.uid())::text
  )
);

-- Also ensure the INSERT policy is correct for room_participants
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;

CREATE POLICY "Users can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (
  -- Users can only insert themselves as participants
  player_id = (auth.uid())::text
);