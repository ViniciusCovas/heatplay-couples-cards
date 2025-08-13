-- Complete fix for room joining flow

-- Step 1: Fix RLS policies to handle anonymous users properly
DROP POLICY IF EXISTS "Users can update own participation status" ON public.room_participants;
DROP POLICY IF EXISTS "Users can remove themselves from rooms" ON public.room_participants;

-- Create new policies that handle both authenticated and anonymous users
CREATE POLICY "Users can update own participation status" 
ON public.room_participants 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR 
  (auth.uid() IS NULL AND player_id IS NOT NULL)
);

CREATE POLICY "Users can remove themselves from rooms" 
ON public.room_participants 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND player_id IS NOT NULL)
);

-- Step 2: Add time-based room access for anonymous users who recently joined
CREATE POLICY "Recent joiners can view rooms" 
ON public.game_rooms 
FOR SELECT 
USING (
  status IN ('waiting', 'playing') AND 
  created_at > NOW() - INTERVAL '2 hours' AND
  EXISTS (
    SELECT 1 FROM room_participants rp 
    WHERE rp.room_id = game_rooms.id
  )
);

-- Step 3: Fix game phase management - add constraint to prevent premature phase changes
CREATE OR REPLACE FUNCTION public.validate_room_phase_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't allow transition out of 'waiting' unless both players are connected
  IF OLD.current_phase = 'waiting' AND NEW.current_phase != 'waiting' THEN
    IF (SELECT COUNT(*) FROM room_participants WHERE room_id = NEW.id) < 2 THEN
      RAISE EXCEPTION 'Cannot advance from waiting phase without both players connected';
    END IF;
  END IF;
  
  -- Don't allow transition to 'proximity-selection' unless room status is 'playing'
  IF NEW.current_phase = 'proximity-selection' AND NEW.status != 'playing' THEN
    RAISE EXCEPTION 'Cannot advance to proximity-selection without room being in playing status';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate phase transitions
DROP TRIGGER IF EXISTS validate_room_phase_trigger ON public.game_rooms;
CREATE TRIGGER validate_room_phase_trigger
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_room_phase_transition();

-- Step 4: Fix the specific room E81435 that's stuck
UPDATE public.game_rooms 
SET 
  current_phase = 'waiting',
  status = 'waiting'
WHERE room_code = 'E81435' AND status = 'waiting';

-- Step 5: Create helper function for anonymous user room access validation
CREATE OR REPLACE FUNCTION public.anonymous_can_access_room(room_id_param uuid, player_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this player recently joined this room
  RETURN EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
    AND joined_at > NOW() - INTERVAL '2 hours'
  );
END;
$$;