-- Fix infinite recursion in game_rooms RLS policies

-- Drop the problematic function-based policies that create circular dependencies
DROP POLICY IF EXISTS "Participants can view rooms via function" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can update rooms via function" ON public.game_rooms;

-- Create new non-recursive policies for participants
CREATE POLICY "Participants can view their rooms" 
ON public.game_rooms 
FOR SELECT 
USING (
  -- Allow access if user participates in this room (without triggering RLS on room_participants)
  id IN (
    SELECT DISTINCT room_id 
    FROM public.room_participants 
    WHERE player_id = auth.uid()::text
  )
);

CREATE POLICY "Participants can update their rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (
  -- Allow updates if user participates in this room (without triggering RLS on room_participants)
  id IN (
    SELECT DISTINCT room_id 
    FROM public.room_participants 
    WHERE player_id = auth.uid()::text
  )
);