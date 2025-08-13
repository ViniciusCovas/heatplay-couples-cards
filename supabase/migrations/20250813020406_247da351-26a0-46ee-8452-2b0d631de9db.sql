
BEGIN;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- 1) Allow SELECT on game_rooms
-- Authenticated users: creator or participant can view their rooms
CREATE POLICY IF NOT EXISTS "Auth users can view their game rooms"
  ON public.game_rooms
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()::text
      OR public.user_participates_in_room(id, auth.uid())
    )
  );

-- Anonymous users: can view rooms that are open (waiting/playing)
-- This enables selecting a room by its room_code prior to join.
CREATE POLICY IF NOT EXISTS "Anon users can view open game rooms"
  ON public.game_rooms
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND status IN ('waiting', 'playing')
  );

-- 2) Allow INSERT into room_participants to join rooms
-- Authenticated users: can join open rooms as themselves
CREATE POLICY IF NOT EXISTS "Auth users can join open rooms"
  ON public.room_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND player_id = auth.uid()::text
    AND public.room_is_open(room_id)
  );

-- Anonymous users: can join open rooms
-- Note: Without auth.uid(), we cannot cryptographically bind player_id to the caller,
-- but this is required for the anonymous join flow.
CREATE POLICY IF NOT EXISTS "Anon users can join open rooms"
  ON public.room_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    AND public.room_is_open(room_id)
  );

COMMIT;
