-- Fix the sync function without pseudo-type
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(
  room_id_param uuid,
  player_id_param text
) 
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