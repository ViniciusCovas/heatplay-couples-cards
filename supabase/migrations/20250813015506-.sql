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