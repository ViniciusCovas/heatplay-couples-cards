-- Fix game_responses RLS policies to support anonymous users

-- Drop existing game_responses policies
DROP POLICY IF EXISTS "Room participants can view responses" ON public.game_responses;
DROP POLICY IF EXISTS "Room participants can create responses" ON public.game_responses;
DROP POLICY IF EXISTS "Room participants can update responses" ON public.game_responses;

-- Create new policies that work with both authenticated and anonymous users
CREATE POLICY "Room participants can view responses" 
ON public.game_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.room_participants 
  WHERE room_id = game_responses.room_id 
  AND (
    player_id = auth.uid()::text OR 
    player_id = game_responses.player_id
  )
));

CREATE POLICY "Room participants can create responses" 
ON public.game_responses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.room_participants 
  WHERE room_id = game_responses.room_id 
  AND player_id = game_responses.player_id
));

CREATE POLICY "Room participants can update responses" 
ON public.game_responses 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.room_participants 
  WHERE room_id = game_responses.room_id 
  AND (
    player_id = auth.uid()::text OR 
    player_id = game_responses.player_id
  )
));