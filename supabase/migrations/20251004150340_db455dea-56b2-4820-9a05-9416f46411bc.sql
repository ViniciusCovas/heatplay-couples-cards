-- Fix handle_proximity_response to remove legacy proximity_response column
-- and ensure proper phase advancement
CREATE OR REPLACE FUNCTION public.handle_proximity_response(
  room_id_param uuid, 
  player_id_param text, 
  is_close_param boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  player_num integer;
  current_room RECORD;
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
  
  -- Update the appropriate player response atomically (REMOVED proximity_response legacy field)
  IF player_num = 1 THEN
    UPDATE public.game_rooms 
    SET player1_proximity_response = is_close_param
    WHERE id = room_id_param;
  ELSE
    UPDATE public.game_rooms 
    SET player2_proximity_response = is_close_param
    WHERE id = room_id_param;
  END IF;
  
  -- ALWAYS advance to level selection when ANY player responds
  UPDATE public.game_rooms 
  SET 
    proximity_question_answered = true,
    current_phase = 'level-selection'
  WHERE id = room_id_param;
  
  RETURN jsonb_build_object(
    'success', true, 
    'advance_to_level_selection', true,
    'player_number', player_num,
    'single_player_advancement', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_proximity_response error: room_id=%, player_id=%, error=%', 
      room_id_param, player_id_param, SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'database_error',
      'details', SQLERRM
    );
END;
$function$;