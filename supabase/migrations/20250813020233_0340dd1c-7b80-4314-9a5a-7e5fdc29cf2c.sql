
BEGIN;

-- 1) Helper function for anon reads without touching room_participants (prevents recursion)
CREATE OR REPLACE FUNCTION public.room_is_open(room_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE id = room_id_param
      AND status IN ('waiting', 'playing')
  );
$$;

-- 2) Remove the recursive SELECT policy on room_participants
DROP POLICY IF EXISTS "Users can view participants via function" ON public.room_participants;

-- 3) Add two safe, non-recursive SELECT policies

-- Authenticated users can view participants of rooms they participate in
-- Uses a SECURITY DEFINER function that bypasses RLS safely and avoids recursion.
CREATE POLICY "Auth users can view participants of their rooms"
  ON public.room_participants
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_user_participant(room_id, auth.uid())
  );

-- Anonymous users can view participants of open rooms (waiting/playing)
-- Uses room_is_open() which only checks game_rooms, avoiding recursion entirely.
CREATE POLICY "Anon users can view participants of open rooms"
  ON public.room_participants
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND public.room_is_open(room_id)
  );

-- 4) Make realtime robust for the affected tables (idempotent)

-- Ensure full row data is emitted for updates
ALTER TABLE public.room_participants REPLICA IDENTITY FULL;
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;

-- Add tables to the realtime publication, ignoring duplicates if already present
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

COMMIT;
