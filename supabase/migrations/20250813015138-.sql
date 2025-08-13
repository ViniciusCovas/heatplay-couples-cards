-- Update the is_user_participant function to handle both authenticated and anonymous users
CREATE OR REPLACE FUNCTION public.is_user_participant(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle both authenticated users (by UUID) and anonymous users (by checking player_id)
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND (
      player_id = user_id_param::text OR 
      (user_id_param IS NOT NULL AND player_id = user_id_param::text)
    )
  );
END;
$function$

-- Create a new function specifically for checking if a player_id participates in a room
CREATE OR REPLACE FUNCTION public.player_participates_in_room(room_id_param uuid, player_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  );
END;
$function$

-- Update RLS policies for room_participants to support anonymous users
DROP POLICY IF EXISTS "Users can view participants via function" ON public.room_participants;
CREATE POLICY "Users can view participants via function" ON public.room_participants
FOR SELECT USING (
  -- Allow if user is authenticated and participates in the room
  (auth.uid() IS NOT NULL AND is_user_participant(room_id, auth.uid())) OR
  -- Allow anonymous users to view participants of rooms they're in (checked by player_id pattern)
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id
  ))
);

-- Update RLS policy for game_sync to support anonymous users
DROP POLICY IF EXISTS "Room participants can view sync events" ON public.game_sync;
CREATE POLICY "Room participants can view sync events" ON public.game_sync
FOR SELECT USING (
  -- Allow if user is authenticated and participates in the room
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id 
    AND room_participants.player_id = auth.uid()::text
  )) OR
  -- Allow anonymous users to view sync events for rooms they participate in
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id
  ))
);

DROP POLICY IF EXISTS "Room participants can create sync events" ON public.game_sync;
CREATE POLICY "Room participants can create sync events" ON public.game_sync
FOR INSERT WITH CHECK (
  -- Allow if user is authenticated and participates in the room
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id 
    AND room_participants.player_id = auth.uid()::text
  )) OR
  -- Allow anonymous users to create sync events for rooms they participate in
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id 
    AND room_participants.player_id = game_sync.triggered_by
  ))
);

-- Update RLS policies for game_responses to support anonymous users
DROP POLICY IF EXISTS "Room participants can view responses" ON public.game_responses;
CREATE POLICY "Room participants can view responses" ON public.game_responses
FOR SELECT USING (
  -- Allow if user is authenticated and participates in the room
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_responses.room_id 
    AND (room_participants.player_id = auth.uid()::text OR room_participants.player_id = game_responses.player_id)
  )) OR
  -- Allow anonymous users to view responses for rooms they participate in
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_responses.room_id
  ))
);

DROP POLICY IF EXISTS "Room participants can create responses" ON public.game_responses;
CREATE POLICY "Room participants can create responses" ON public.game_responses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_responses.room_id 
    AND room_participants.player_id = game_responses.player_id
  )
);

DROP POLICY IF EXISTS "Room participants can update responses" ON public.game_responses;
CREATE POLICY "Room participants can update responses" ON public.game_responses
FOR UPDATE USING (
  -- Allow if user is authenticated and participates in the room
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_responses.room_id 
    AND (room_participants.player_id = auth.uid()::text OR room_participants.player_id = game_responses.player_id)
  )) OR
  -- Allow anonymous users to update responses for rooms they participate in
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_responses.room_id 
    AND room_participants.player_id = game_responses.player_id
  ))
);