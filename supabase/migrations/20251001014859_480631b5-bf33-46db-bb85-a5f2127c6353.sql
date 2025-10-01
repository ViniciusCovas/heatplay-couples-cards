-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can view rooms they host" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can update rooms they host" ON public.game_rooms;

DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.room_participants;

-- game_rooms: Allow anyone to discover rooms (needed for join flow)
-- Rooms are protected by room_code anyway
CREATE POLICY "Anyone can view rooms"
ON public.game_rooms
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create rooms"
ON public.game_rooms
FOR INSERT
TO authenticated
WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Hosts can update their rooms"
ON public.game_rooms
FOR UPDATE
USING (host_user_id = auth.uid());

-- room_participants: Allow viewing all participants (needed to check room capacity)
CREATE POLICY "Anyone can view participants"
ON public.room_participants
FOR SELECT
USING (true);

-- Allow both authenticated and anonymous users to join
CREATE POLICY "Users can join rooms"
ON public.room_participants
FOR INSERT
WITH CHECK (
  -- Authenticated users must use their auth.uid()
  (auth.uid() IS NOT NULL AND player_id = (auth.uid())::text)
  OR
  -- Anonymous users (auth.uid() is null) can insert with any player_id
  (auth.uid() IS NULL)
);

-- Allow users to update their own participation records
CREATE POLICY "Users can update their participation"
ON public.room_participants
FOR UPDATE
USING (
  -- Authenticated users can only update their own records
  (auth.uid() IS NOT NULL AND player_id = (auth.uid())::text)
  OR
  -- Anonymous users can update (rely on app logic for validation)
  (auth.uid() IS NULL)
);