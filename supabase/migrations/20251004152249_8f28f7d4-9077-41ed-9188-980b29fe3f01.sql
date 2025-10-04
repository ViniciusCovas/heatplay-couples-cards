-- Fix game_sync RLS policies to support both authenticated and anonymous users
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can create sync events" ON public.game_sync;
DROP POLICY IF EXISTS "Authenticated users can view sync events" ON public.game_sync;

-- Create new policies that support room participants (authenticated or anonymous)
CREATE POLICY "Participants can create sync events"
ON public.game_sync
FOR INSERT
WITH CHECK (
  -- Allow authenticated users creating their own events
  (triggered_by = auth.uid()::text)
  OR
  -- Allow anonymous users who are valid room participants
  (
    auth.uid() IS NULL 
    AND EXISTS (
      SELECT 1 FROM public.room_participants 
      WHERE room_participants.room_id = game_sync.room_id 
      AND room_participants.player_id = game_sync.triggered_by
    )
  )
);

CREATE POLICY "Participants can view sync events"
ON public.game_sync
FOR SELECT
USING (
  -- Allow authenticated users to see their own events
  (triggered_by = auth.uid()::text)
  OR
  -- Allow anonymous users to see events from their room
  (
    auth.uid() IS NULL 
    AND EXISTS (
      SELECT 1 FROM public.room_participants 
      WHERE room_participants.room_id = game_sync.room_id 
      AND room_participants.player_id = game_sync.triggered_by
    )
  )
  OR
  -- Allow users to see events from rooms they participate in
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = game_sync.room_id 
    AND (
      room_participants.player_id = auth.uid()::text
      OR (auth.uid() IS NULL AND room_participants.player_id = game_sync.triggered_by)
    )
  )
);