-- Fix level_selection_votes to support anonymous players (TEXT player_id)
-- CORRECT ORDER: Drop policies FIRST, then alter column

-- 1) Drop all existing RLS policies first
DROP POLICY IF EXISTS "Authenticated users can submit votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Authenticated users can view their votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Authenticated users can update their votes" ON public.level_selection_votes;

-- 2) Drop the foreign key constraint to auth.users
ALTER TABLE public.level_selection_votes 
  DROP CONSTRAINT IF EXISTS level_selection_votes_player_id_fkey;

-- 3) Now change player_id from UUID to TEXT
ALTER TABLE public.level_selection_votes 
  ALTER COLUMN player_id TYPE TEXT USING player_id::TEXT;

-- 4) Create new RLS policies that work with TEXT player_id
CREATE POLICY "Users can submit their votes" 
  ON public.level_selection_votes 
  FOR INSERT 
  WITH CHECK (
    player_id = (auth.uid())::text OR 
    (auth.uid() IS NULL AND player_id IS NOT NULL)
  );

CREATE POLICY "Users can view their votes" 
  ON public.level_selection_votes 
  FOR SELECT 
  USING (
    player_id = (auth.uid())::text OR 
    (auth.uid() IS NULL AND player_id IS NOT NULL)
  );

CREATE POLICY "Users can update their votes" 
  ON public.level_selection_votes 
  FOR UPDATE 
  USING (
    player_id = (auth.uid())::text OR 
    (auth.uid() IS NULL AND player_id IS NOT NULL)
  );

-- 5) Update handle_level_selection to remove UUID casting
DROP FUNCTION IF EXISTS public.handle_level_selection(uuid, text, integer);

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
  -- Lock the room for this transaction
  SELECT selected_language INTO current_language 
  FROM public.game_rooms 
  WHERE id = room_id_param 
  FOR UPDATE;
  
  -- Upsert the player's vote (NO UUID CAST - use TEXT directly)
  INSERT INTO public.level_selection_votes (room_id, player_id, selected_level)
  VALUES (room_id_param, player_id_param, selected_level_param)
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    selected_level = EXCLUDED.selected_level,
    created_at = now();
  
  -- Check how many players have voted
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
  
  -- Get the other player's level choice (NO UUID CAST)
  SELECT selected_level INTO other_player_level
  FROM public.level_selection_votes 
  WHERE room_id = room_id_param 
    AND player_id != player_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if levels match
  IF selected_level_param = other_player_level THEN
    -- Levels match! Update game room
    UPDATE public.game_rooms 
    SET 
      level = selected_level_param,
      current_phase = 'card-display',
      current_card = NULL,
      used_cards = '{}',
      current_card_index = 0,
      selected_language = COALESCE(current_language, 'en')
    WHERE id = room_id_param;
    
    -- Clean up votes
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
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'An error occurred processing your selection',
      'details', SQLERRM,
      'code', SQLSTATE
    );
END;
$function$;