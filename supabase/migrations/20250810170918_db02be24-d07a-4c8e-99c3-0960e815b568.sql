-- Clean up duplicate and recursive RLS policies

-- Drop all existing policies on game_rooms
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Hosts can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Hosts can view rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can view rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Room participants can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Room participants can view rooms" ON public.game_rooms;

-- Drop all existing policies on room_participants
DROP POLICY IF EXISTS "Anyone can join rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Participants can leave rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Participants can update their own records" ON public.room_participants;
DROP POLICY IF EXISTS "Room participants can view each other" ON public.room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.room_participants;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.room_participants;

-- Create clean policies for game_rooms using security definer function
CREATE POLICY "Authenticated users can create rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Hosts can view their rooms" 
ON public.game_rooms 
FOR SELECT 
USING (host_user_id = auth.uid());

CREATE POLICY "Participants can view rooms via function" 
ON public.game_rooms 
FOR SELECT 
USING (is_user_participant(id, auth.uid()));

CREATE POLICY "Hosts can update their rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (host_user_id = auth.uid());

CREATE POLICY "Participants can update rooms via function" 
ON public.game_rooms 
FOR UPDATE 
USING (is_user_participant(id, auth.uid()));

-- Create clean policies for room_participants  
CREATE POLICY "Anyone can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view participants via function" 
ON public.room_participants 
FOR SELECT 
USING (is_user_participant(room_id, auth.uid()));

CREATE POLICY "Users can update their own participation" 
ON public.room_participants 
FOR UPDATE 
USING (player_id = auth.uid()::text);

CREATE POLICY "Users can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (player_id = auth.uid()::text);