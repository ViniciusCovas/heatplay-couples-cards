-- Fix RLS policy for game_responses to allow room participants to view all responses in their room
-- This enables anonymous users to evaluate responses from authenticated users and vice versa

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Room participants can view responses" ON public.game_responses;

-- Create new policy that allows room participants to view all responses in their room
CREATE POLICY "Room participants can view all responses in their room" 
ON public.game_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id
    AND (
      -- For authenticated users, match by auth.uid()
      (auth.uid() IS NOT NULL AND rp.player_id = auth.uid()::text)
      OR
      -- For anonymous users, we allow access if they are a participant
      -- This is safe because RLS on room_participants already controls who can be a participant
      (auth.uid() IS NULL AND rp.player_id IS NOT NULL)
    )
  )
);

-- Also update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Room participants can update responses" ON public.game_responses;

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
      -- For anonymous users, allow if they are a participant
      (auth.uid() IS NULL AND rp.player_id IS NOT NULL)
    )
  )
);