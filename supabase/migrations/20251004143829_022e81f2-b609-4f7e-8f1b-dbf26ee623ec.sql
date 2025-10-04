-- Update sync_game_state_reliably to support both authenticated and anonymous users
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
  room_exists boolean;
  participant_exists boolean;
BEGIN
  -- Check if room exists and is active
  SELECT EXISTS(
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id_param 
    AND status IN ('waiting', 'playing')
  ) INTO room_exists;
  
  IF NOT room_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Check if player is a participant (using provided player_id)
  SELECT EXISTS(
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  ) INTO participant_exists;
  
  IF NOT participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Update connection state (using provided player_id)
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', NOW())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = NOW(),
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'room_id', room_id_param,
    'player_id', player_id_param,
    'timestamp', NOW()
  );
END;
$function$;