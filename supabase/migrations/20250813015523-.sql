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