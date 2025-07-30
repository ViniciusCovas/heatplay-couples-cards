-- Update the remaining functions with proper search_path (continuing from previous)
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

CREATE OR REPLACE FUNCTION public.get_user_credits(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  user_balance INTEGER;
BEGIN
  SELECT balance INTO user_balance
  FROM public.credits 
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(user_balance, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credit(room_id_param uuid, user_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  current_balance INTEGER;
  session_record RECORD;
BEGIN
  -- Lock the user's credits row
  SELECT balance INTO current_balance
  FROM public.credits 
  WHERE user_id = user_id_param
  FOR UPDATE;
  
  -- Check if user has credits
  IF current_balance < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', COALESCE(current_balance, 0)
    );
  END IF;
  
  -- Check if room already has an active session
  IF EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id_param 
    AND credit_status = 'active_session'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'session_already_active'
    );
  END IF;
  
  -- Create session record
  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status)
  VALUES (user_id_param, room_id_param, 1, 'active')
  RETURNING * INTO session_record;
  
  -- Update credits
  UPDATE public.credits 
  SET 
    balance = balance - 1,
    total_consumed = total_consumed + 1,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Update room status
  UPDATE public.game_rooms 
  SET 
    credit_status = 'active_session',
    session_id = session_record.id,
    host_user_id = user_id_param
  WHERE id = room_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', session_record.id,
    'new_balance', current_balance - 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_credits(user_id_param uuid, credits_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Upsert credits record
  INSERT INTO public.credits (user_id, balance, total_purchased)
  VALUES (user_id_param, credits_amount, credits_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.credits.balance + credits_amount,
    total_purchased = public.credits.total_purchased + credits_amount,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_added', credits_amount
  );
END;
$function$;