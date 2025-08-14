-- Create atomic proximity response handler
CREATE OR REPLACE FUNCTION public.handle_proximity_response(
  room_id_param uuid, 
  player_id_param text, 
  is_close_param boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  player_num integer;
  current_room RECORD;
  both_responded boolean := false;
BEGIN
  -- Lock the room for atomic operation
  SELECT * INTO current_room
  FROM public.game_rooms 
  WHERE id = room_id_param 
  FOR UPDATE;
  
  IF current_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Get player number
  SELECT player_number INTO player_num
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF player_num IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'player_not_found');
  END IF;
  
  -- Update the appropriate player response atomically
  IF player_num = 1 THEN
    UPDATE public.game_rooms 
    SET 
      player1_proximity_response = is_close_param,
      proximity_response = is_close_param -- Keep legacy field
    WHERE id = room_id_param;
    
    -- Check if both players have now responded
    both_responded := current_room.player2_proximity_response IS NOT NULL;
  ELSE
    UPDATE public.game_rooms 
    SET 
      player2_proximity_response = is_close_param,
      proximity_response = is_close_param -- Keep legacy field  
    WHERE id = room_id_param;
    
    -- Check if both players have now responded
    both_responded := current_room.player1_proximity_response IS NOT NULL;
  END IF;
  
  -- If both players responded, advance to level selection
  IF both_responded THEN
    UPDATE public.game_rooms 
    SET 
      proximity_question_answered = true,
      current_phase = 'level-selection'
    WHERE id = room_id_param;
    
    RETURN jsonb_build_object(
      'success', true, 
      'both_responded', true,
      'advance_to_level_selection', true,
      'player_number', player_num
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'both_responded', false,
      'waiting_for_partner', true,
      'player_number', player_num
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'database_error');
END;
$function$;