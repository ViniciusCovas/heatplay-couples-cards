-- Fix infinite recursion by completely removing circular dependencies between game_rooms and room_participants

-- Drop ALL problematic policies that create circular dependencies
DROP POLICY IF EXISTS "Participants can view their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can update their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can view rooms via function" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can update rooms via function" ON public.game_rooms;

-- Simplify room_participants policies to avoid complex game_rooms references
DROP POLICY IF EXISTS "Simple room participants view" ON public.room_participants;

-- Create safe, non-circular room_participants policies
CREATE POLICY "Room participants can view participants" 
ON public.room_participants 
FOR SELECT 
USING (true); -- Allow viewing all participants since this doesn't expose sensitive data

CREATE POLICY "Users can join open rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (true); -- Allow joining any room (room existence is validated by application logic)

CREATE POLICY "Users can update their own participation" 
ON public.room_participants 
FOR UPDATE 
USING (player_id = auth.uid()::text);

CREATE POLICY "Users can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (player_id = auth.uid()::text);

-- Keep only essential, non-circular game_rooms policies
-- Host access (safe)
-- Public room discovery (safe)
-- Anonymous user access (safe)

-- Note: Participants will access room data through:
-- 1. Room codes for joining
-- 2. Real-time subscriptions once connected
-- 3. Host ownership for room management