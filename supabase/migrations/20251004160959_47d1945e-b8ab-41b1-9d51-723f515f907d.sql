-- 1) Create missing game_flow_queue table to stop background errors
CREATE TABLE IF NOT EXISTS public.game_flow_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_flow_queue_room ON public.game_flow_queue (room_id);
CREATE INDEX IF NOT EXISTS idx_game_flow_queue_processed ON public.game_flow_queue (processed, created_at);

-- 2) Ensure realtime works reliably for game_rooms
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
  EXCEPTION WHEN others THEN
    -- Table may already be added; ignore error
    NULL;
  END;
END$$;

-- 3) Unify handle_level_selection to a single, reliable signature
-- Drop any existing overloads first
DROP FUNCTION IF EXISTS public.handle_level_selection(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.handle_level_selection(uuid, text, integer);

-- Recreate with player_id_param as text; cast to uuid internally
CREATE OR REPLACE FUNCTION public.handle_level_selection(
  room_id_param uuid,
  player_id_param text,
  selected_level_param integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vote_count INTEGER;
  other_player_level INTEGER;
  current_language VARCHAR;
BEGIN
  -- Lock the room for this transaction to prevent race conditions
  SELECT selected_language INTO current_language 
  FROM public.game_rooms 
  WHERE id = room_id_param 
  FOR UPDATE;
  
  -- Upsert the player's vote (atomic upsert)
  INSERT INTO public.level_selection_votes (room_id, player_id, selected_level)
  VALUES (room_id_param, player_id_param::uuid, selected_level_param)
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    selected_level = EXCLUDED.selected_level,
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
    AND player_id != player_id_param::uuid
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if levels match
  IF selected_level_param = other_player_level THEN
    -- Levels match! Update game room atomically while PRESERVING language
    UPDATE public.game_rooms 
    SET 
      level = selected_level_param,
      current_phase = 'card-display',
      current_card = NULL,
      used_cards = '{}',
      current_card_index = 0,
      selected_language = COALESCE(current_language, 'en')
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
    -- Return error status with diagnostic details
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'An error occurred processing your selection',
      'details', SQLERRM
    );
END;
$function$;