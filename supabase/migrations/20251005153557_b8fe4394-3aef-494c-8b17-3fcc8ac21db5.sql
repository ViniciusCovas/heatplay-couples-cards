-- Create RPC function for atomic card selection
-- This prevents card drift by ensuring only one client can set current_card
CREATE OR REPLACE FUNCTION public.set_current_card_if_missing(
  room_id_param uuid,
  language_param varchar DEFAULT 'en',
  level_param integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_card_value text;
  selected_card_id text;
  room_used_cards text[];
BEGIN
  -- Lock the room row to prevent race conditions
  SELECT current_card, used_cards INTO current_card_value, room_used_cards
  FROM public.game_rooms 
  WHERE id = room_id_param
  FOR UPDATE;
  
  -- If current_card already exists, return it (no-op)
  IF current_card_value IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'card_id', current_card_value,
      'already_set', true
    );
  END IF;
  
  -- Call existing robust card selection logic
  selected_card_id := public.select_next_card_robust(
    room_id_param, 
    COALESCE(room_used_cards, '{}'::text[])
  );
  
  IF selected_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_cards_available'
    );
  END IF;
  
  -- Atomically set the card ONLY if still NULL
  UPDATE public.game_rooms 
  SET current_card = selected_card_id
  WHERE id = room_id_param 
    AND current_card IS NULL;
  
  -- Verify the update succeeded
  IF NOT FOUND THEN
    -- Another client beat us to it, fetch the current value
    SELECT current_card INTO current_card_value
    FROM public.game_rooms 
    WHERE id = room_id_param;
    
    RETURN jsonb_build_object(
      'success', true,
      'card_id', current_card_value,
      'already_set', true,
      'race_detected', true
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'card_id', selected_card_id,
    'newly_set', true
  );
END;
$function$;