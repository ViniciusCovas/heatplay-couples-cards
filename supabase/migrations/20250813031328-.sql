-- Fix infinite recursion by removing ALL circular dependencies

-- First, drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Participants can view their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can update their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can view rooms via function" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can update rooms via function" ON public.game_rooms;

-- Drop all existing room_participants policies to avoid conflicts
DROP POLICY IF EXISTS "Simple room participants view" ON public.room_participants;
DROP POLICY IF EXISTS "Users can join open rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Room participants can view participants" ON public.room_participants;

-- Create new safe room_participants policies without circular references
CREATE POLICY "Room participants can view all participants" 
ON public.room_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own participation status" 
ON public.room_participants 
FOR UPDATE 
USING (player_id = auth.uid()::text);

CREATE POLICY "Users can remove themselves from rooms" 
ON public.room_participants 
FOR DELETE 
USING (player_id = auth.uid()::text);

-- game_rooms now only has the safe, non-circular policies:
-- - "Anon users can view rooms they participate in" (safe, no circular reference)
-- - "Users can discover rooms by code" (safe, no circular reference) 
-- - "Hosts can view their rooms" (safe, direct column access)
-- - "Hosts can update their rooms" (safe, direct column access)
-- - "Authenticated users can create rooms" (safe, creation only)