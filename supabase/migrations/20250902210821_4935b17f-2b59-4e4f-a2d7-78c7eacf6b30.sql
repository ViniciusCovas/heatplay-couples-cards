-- Fix UPDATE RLS policy for game_responses to properly handle anonymous user evaluations
-- This fixes the logical flaw where anonymous users couldn't update evaluations due to incorrect player_id validation

-- Drop the existing flawed UPDATE policy
DROP POLICY IF EXISTS "Room participants can update responses in their room" ON public.game_responses;

-- Create new UPDATE policy that properly validates anonymous users
CREATE POLICY "Room participants can update responses in their room" 
ON public.game_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id
    AND (
      -- For authenticated users, match by auth.uid()
      (auth.uid() IS NOT NULL AND rp.player_id = auth.uid()::text)
      OR
      -- For anonymous users, check that the evaluating player is actually in the room
      -- This uses the evaluation_by field to identify which anonymous user is making the update
      (auth.uid() IS NULL AND rp.player_id = game_responses.evaluation_by)
    )
  )
);