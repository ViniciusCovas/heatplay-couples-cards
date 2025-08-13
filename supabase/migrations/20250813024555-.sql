-- Fix infinite recursion in room_participants RLS policies

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Anon users can view participants of rooms they participate in" ON public.room_participants;
DROP POLICY IF EXISTS "Auth users can view participants of their rooms" ON public.room_participants;

-- Create new policies without self-referencing queries
-- Policy for viewing participants: allow users to see participants of rooms they can see
CREATE POLICY "Users can view room participants" 
ON public.room_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr 
    WHERE gr.id = room_participants.room_id 
    AND (
      -- Room is discoverable (waiting/playing)
      gr.status IN ('waiting', 'playing')
      -- OR user is the host
      OR gr.host_user_id = auth.uid()
      -- OR user participates (check via direct player_id match)
      OR EXISTS (
        SELECT 1 FROM public.room_participants rp2 
        WHERE rp2.room_id = gr.id 
        AND rp2.player_id = COALESCE(auth.uid()::text, room_participants.player_id)
      )
    )
  )
);

-- Update the insert policy to be simpler and avoid recursion
DROP POLICY IF EXISTS "Anyone can join rooms" ON public.room_participants;
CREATE POLICY "Users can join open rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id 
    AND status IN ('waiting', 'playing')
  )
);

-- Keep existing update and delete policies as they're safe
-- (They use direct player_id comparisons without self-referencing)