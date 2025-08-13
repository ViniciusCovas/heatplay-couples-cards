-- Complete fix for infinite recursion in room_participants RLS policies

-- Drop the problematic recursive SELECT policy
DROP POLICY IF EXISTS "Users can view room participants" ON public.room_participants;

-- Create a simple, non-recursive SELECT policy
CREATE POLICY "Simple room participants view" 
ON public.room_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_participants.room_id 
    AND (
      -- Room is discoverable (waiting/playing)
      status IN ('waiting', 'playing') 
      -- OR user is the host
      OR host_user_id = auth.uid()
    )
  )
);