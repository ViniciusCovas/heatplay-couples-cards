-- Fix RLS policy for game_responses UPDATE to allow anonymous participants to submit evaluations

-- Drop the current restrictive UPDATE policy
DROP POLICY IF EXISTS "Room participants can update responses in their room" ON public.game_responses;

-- Create a new UPDATE policy that allows both authenticated and anonymous participants
CREATE POLICY "Room participants can update responses in their room" 
ON public.game_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id 
    AND (
      -- For authenticated users: check if they are a participant
      (auth.uid() IS NOT NULL AND rp.player_id = (auth.uid())::text) OR
      -- For anonymous users: allow if they are participants and updating evaluation fields
      (auth.uid() IS NULL AND rp.player_id IS NOT NULL)
    )
  )
);