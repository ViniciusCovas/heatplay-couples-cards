-- Security Enhancement: Add search_path protection to all SECURITY DEFINER functions
-- This prevents SQL injection attacks through search_path manipulation

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_random_questions_for_level(level_id_param uuid, language_param character varying DEFAULT 'en'::character varying, limit_param integer DEFAULT 10)
 RETURNS TABLE(id uuid, text text, category text, level_id uuid, language character varying, created_at timestamp with time zone, updated_at timestamp with time zone, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.category, q.level_id, q.language, q.created_at, q.updated_at, q.is_active
  FROM public.questions q
  WHERE q.level_id = level_id_param 
    AND q.language = language_param 
    AND q.is_active = true
  ORDER BY RANDOM()
  LIMIT limit_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_level_selection(room_id_param uuid, player_id_param text, selected_level_param integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.repair_stuck_evaluations()
 RETURNS TABLE(room_id uuid, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  stuck_room RECORD;
  missing_sync_count integer;
BEGIN
  -- Find rooms stuck in evaluation phase without proper sync events
  FOR stuck_room IN 
    SELECT 
      gr.id as room_id,
      gr.room_code,
      gr.current_phase,
      gr.current_turn,
      COUNT(DISTINCT gres.id) as response_count,
      COUNT(DISTINCT gs.id) as sync_count
    FROM public.game_rooms gr
    LEFT JOIN public.game_responses gres ON gr.id = gres.room_id 
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
    LEFT JOIN public.game_sync gs ON gr.id = gs.room_id 
      AND gs.action_type = 'response_submit'
    WHERE gr.current_phase = 'evaluation'
      AND gr.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY gr.id, gr.room_code, gr.current_phase, gr.current_turn
    HAVING COUNT(DISTINCT gres.id) > COUNT(DISTINCT gs.id)
  LOOP
    -- Create missing sync event for this stuck room
    INSERT INTO public.game_sync (
      room_id, 
      action_type, 
      action_data, 
      triggered_by
    ) 
    SELECT 
      stuck_room.room_id,
      'response_submit',
      jsonb_build_object(
        'question', q.text,
        'response', gres.response,
        'response_time', gres.response_time,
        'evaluating_player', stuck_room.current_turn,
        'round_number', gres.round_number,
        'timestamp', gres.created_at::text,
        'auto_repair', true
      ),
      gres.player_id
    FROM public.game_responses gres
    JOIN public.questions q ON q.id::text = gres.card_id
    WHERE gres.room_id = stuck_room.room_id
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.game_sync gs2 
        WHERE gs2.room_id = stuck_room.room_id 
        AND gs2.action_type = 'response_submit'
        AND gs2.created_at >= gres.created_at
      )
    ORDER BY gres.created_at DESC
    LIMIT 1;
    
    RETURN QUERY SELECT stuck_room.room_id, 'repaired_missing_sync_event'::text;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_player_number(room_id_param uuid, player_id_param text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  player_num integer;
BEGIN
  SELECT player_number INTO player_num
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param
  LIMIT 1;
  
  RETURN COALESCE(player_num, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fix_stuck_evaluation_rooms()
 RETURNS TABLE(room_id uuid, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation phase with responses but missing sync events
  FOR stuck_room IN 
    SELECT DISTINCT
      gr.id as room_id,
      gr.room_code,
      gr.current_phase,
      gr.current_turn
    FROM public.game_rooms gr
    JOIN public.game_responses gres ON gr.id = gres.room_id 
    WHERE gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gr.current_phase != 'evaluation'
      AND gr.created_at > NOW() - INTERVAL '24 hours'
  LOOP
    -- Update to evaluation phase
    UPDATE public.game_rooms 
    SET current_phase = 'evaluation'
    WHERE id = stuck_room.room_id;
    
    RETURN QUERY SELECT stuck_room.room_id, 'fixed_stuck_evaluation_room'::text;
  END LOOP;
END;
$function$;