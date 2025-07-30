-- Update handle_level_selection function to preserve room language
CREATE OR REPLACE FUNCTION public.handle_level_selection(room_id_param uuid, player_id_param text, selected_level_param integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  vote_count INTEGER;
  other_player_level INTEGER;
  current_language VARCHAR;
  result JSONB;
BEGIN
  -- Lock the room for this transaction to prevent race conditions
  SELECT selected_language INTO current_language 
  FROM public.game_rooms 
  WHERE id = room_id_param 
  FOR UPDATE;
  
  -- Upsert the player's vote (atomic delete + insert)
  INSERT INTO public.level_selection_votes (room_id, player_id, selected_level)
  VALUES (room_id_param, player_id_param, selected_level_param)
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    selected_level = selected_level_param,
    created_at = now();
  
  -- Check how many players have voted for this room
  SELECT COUNT(DISTINCT player_id) INTO vote_count
  FROM public.level_selection_votes 
  WHERE room_id = room_id_param;
  
  -- If only one player has voted, return waiting status
  IF vote_count < 2 THEN
    RETURN jsonb_build_object(
      'status', 'waiting',
      'message', 'Waiting for other player',
      'selected_level', selected_level_param
    );
  END IF;
  
  -- Get the other player's level choice
  SELECT selected_level INTO other_player_level
  FROM public.level_selection_votes 
  WHERE room_id = room_id_param 
    AND player_id != player_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if levels match
  IF selected_level_param = other_player_level THEN
    -- Levels match! Update game room atomically while PRESERVING language
    UPDATE public.game_rooms 
    SET 
      level = selected_level_param,
      current_phase = 'card-display',
      current_card = null,
      used_cards = '{}',
      current_card_index = 0,
      selected_language = COALESCE(current_language, 'en') -- Preserve existing language or default to English
    WHERE id = room_id_param;
    
    -- Clean up votes since we're moving to next phase
    DELETE FROM public.level_selection_votes 
    WHERE room_id = room_id_param;
    
    RETURN jsonb_build_object(
      'status', 'agreed',
      'message', 'Level agreed! Starting game...',
      'selected_level', selected_level_param,
      'countdown', 3
    );
  ELSE
    -- Levels don't match
    RETURN jsonb_build_object(
      'status', 'mismatch',
      'message', 'Different levels selected. Try again.',
      'player_level', selected_level_param,
      'other_level', other_player_level
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error status
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'An error occurred processing your selection'
    );
END;
$function$;