
-- Create atomic level selection function to prevent race conditions
CREATE OR REPLACE FUNCTION public.handle_level_selection(
  room_id_param UUID,
  player_id_param TEXT,
  selected_level_param INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_count INTEGER;
  other_player_level INTEGER;
  result JSONB;
BEGIN
  -- Lock the room for this transaction to prevent race conditions
  PERFORM 1 FROM public.game_rooms 
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
    -- Levels match! Update game room atomically
    UPDATE public.game_rooms 
    SET 
      level = selected_level_param,
      current_phase = 'card-display',
      current_card = null,
      used_cards = '{}',
      current_card_index = 0
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
$$;

-- Add unique constraint to prevent duplicate votes per player per room
ALTER TABLE public.level_selection_votes 
ADD CONSTRAINT unique_player_room_vote 
UNIQUE (room_id, player_id);
