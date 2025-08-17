-- Fix anonymous user access by updating existing RLS policies
-- This replaces the broken policies that prevent anonymous access

-- 1. Update levels table policy to allow anonymous access
DROP POLICY IF EXISTS "Anyone can view active levels" ON public.levels;
CREATE POLICY "Anyone can view active levels" 
ON public.levels 
FOR SELECT 
USING (is_active = true);

-- 2. Clean up orphaned data and stuck rooms
DELETE FROM public.room_participants 
WHERE room_id NOT IN (SELECT id FROM public.game_rooms);

DELETE FROM public.connection_states 
WHERE room_id NOT IN (SELECT id FROM public.game_rooms);

DELETE FROM public.level_selection_votes 
WHERE room_id NOT IN (SELECT id FROM public.game_rooms);

-- Reset stuck rooms to proper state
UPDATE public.game_rooms 
SET 
  credit_status = 'active_session',
  current_phase = 'proximity-selection'
WHERE 
  status = 'playing' 
  AND credit_status = 'pending_credit'
  AND created_at > NOW() - INTERVAL '2 hours';

-- 3. Create helper function for anonymous user access validation
CREATE OR REPLACE FUNCTION public.anonymous_can_access_room(room_id_param uuid, player_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this player recently joined this room
  RETURN EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
    AND joined_at > NOW() - INTERVAL '2 hours'
  );
END;
$function$;

-- 4. Create function to help with player number assignment
CREATE OR REPLACE FUNCTION public.assign_player_number(room_id_param uuid, player_id_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigned_number integer;
  existing_participants integer;
BEGIN
  -- Lock the room to prevent race conditions
  PERFORM 1 FROM public.game_rooms WHERE id = room_id_param FOR UPDATE;
  
  -- Count existing participants
  SELECT COUNT(*) INTO existing_participants
  FROM public.room_participants 
  WHERE room_id = room_id_param;
  
  -- If room is full, return 0
  IF existing_participants >= 2 THEN
    RETURN 0;
  END IF;
  
  -- Check if player already exists
  SELECT player_number INTO assigned_number
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF assigned_number IS NOT NULL THEN
    RETURN assigned_number;
  END IF;
  
  -- Assign player number based on what's available
  IF existing_participants = 0 THEN
    assigned_number := 1;
  ELSE
    -- Check if player 1 exists
    IF EXISTS (SELECT 1 FROM public.room_participants WHERE room_id = room_id_param AND player_number = 1) THEN
      assigned_number := 2;
    ELSE
      assigned_number := 1;
    END IF;
  END IF;
  
  RETURN assigned_number;
END;
$function$;

-- 5. Create sync function for game state
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(room_id_param uuid, player_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_room record;
  player_participant record;
BEGIN
  -- Verify player participation
  SELECT * INTO player_participant
  FROM public.room_participants
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF player_participant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Get current room state
  SELECT * INTO current_room
  FROM public.game_rooms
  WHERE id = room_id_param;
  
  IF current_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Update connection state
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', now())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = now(),
    updated_at = now();
  
  -- Return current game state for sync
  RETURN jsonb_build_object(
    'success', true,
    'room_state', to_jsonb(current_room),
    'player_number', player_participant.player_number,
    'connection_updated', true
  );
END;
$function$;

-- 6. Create participation check function
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
$function$;