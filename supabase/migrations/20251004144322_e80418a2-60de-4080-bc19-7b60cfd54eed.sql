-- Drop existing restrictive RLS policies on connection_states
DROP POLICY IF EXISTS "Authenticated users can manage their connection" ON public.connection_states;
DROP POLICY IF EXISTS "Authenticated users can view their connection" ON public.connection_states;
DROP POLICY IF EXISTS "Authenticated users can update their connection" ON public.connection_states;

-- Allow participants to view connection states in their room
CREATE POLICY "Participants can view room connection states"
ON public.connection_states
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = connection_states.room_id
    AND (
      player_id = (auth.uid())::text
      OR auth.uid() IS NULL
    )
  )
);

-- Allow participants to insert their own connection state
CREATE POLICY "Participants can create their connection state"
ON public.connection_states
FOR INSERT
WITH CHECK (
  -- Must be a participant in the room
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = connection_states.room_id
    AND player_id = connection_states.player_id
  )
  AND (
    -- Either authenticated user matches player_id OR anonymous user
    player_id = (auth.uid())::text
    OR auth.uid() IS NULL
  )
);

-- Allow participants to update their own connection state
CREATE POLICY "Participants can update their connection state"
ON public.connection_states
FOR UPDATE
USING (
  -- Must be a participant in the room
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = connection_states.room_id
    AND player_id = connection_states.player_id
  )
  AND (
    -- Either authenticated user matches player_id OR anonymous user
    player_id = (auth.uid())::text
    OR auth.uid() IS NULL
  )
);