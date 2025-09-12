-- Initialize existing rooms with the new sub-turn fields for proper game flow
UPDATE public.game_rooms 
SET 
  question_sub_turn = 'first_response',
  question_first_responder = current_turn,
  question_completion_status = 'incomplete'
WHERE 
  status = 'playing' 
  AND question_sub_turn IS NULL;

-- Update the initialization logic in game advancement to ensure first_responder is set
CREATE OR REPLACE FUNCTION public.consume_credit_for_room_v2(room_code_param text, user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  session_record RECORD;
  target_room_id UUID;
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
  
  -- Find the room by code and ensure it's owned by the user
  SELECT id INTO target_room_id
  FROM public.game_rooms 
  WHERE room_code = room_code_param 
  AND host_user_id = user_id_param
  AND credit_status = 'pending_credit';
  
  IF target_room_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'room_not_found_or_not_owned'
    );
  END IF;
  
  -- Check if room already has an active session
  IF EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = target_room_id 
    AND credit_status = 'active_session'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'session_already_active'
    );
  END IF;
  
  -- Create session record
  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status)
  VALUES (user_id_param, target_room_id, 1, 'active')
  RETURNING * INTO session_record;
  
  -- Update credits
  UPDATE public.credits 
  SET 
    balance = balance - 1,
    total_consumed = total_consumed + 1,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Update room status to 'playing' AND set initial sub-turn state (ATOMIC OPERATION)
  UPDATE public.game_rooms 
  SET 
    status = 'playing',
    credit_status = 'active_session',
    session_id = session_record.id,
    started_at = now(),
    current_phase = 'proximity-selection',
    question_sub_turn = 'first_response',
    question_first_responder = current_turn,
    question_completion_status = 'incomplete'
  WHERE id = target_room_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', session_record.id,
    'new_balance', current_balance - 1,
    'room_id', target_room_id
  );
END;
$function$;