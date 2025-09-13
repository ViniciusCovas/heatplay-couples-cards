-- Create secure evaluation submission RPC function
CREATE OR REPLACE FUNCTION public.submit_response_evaluation(
  response_id_param uuid,
  player_id_param text,
  evaluation_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  response_record record;
  room_record record;
  evaluating_player_number integer;
  responding_player_number integer;
  other_player_id text;
  current_sub_turn text;
  next_player text;
  next_sub_turn text;
  evaluation_count integer;
  total_responses integer;
  game_finished boolean := false;
BEGIN
  -- Get the response record with room info
  SELECT gr.*, rp.player_number as evaluating_player_number
  INTO response_record
  FROM public.game_responses gr
  JOIN public.room_participants rp ON rp.room_id = gr.room_id AND rp.player_id = player_id_param
  WHERE gr.id = response_id_param;
  
  IF response_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'response_not_found');
  END IF;
  
  -- Get room details
  SELECT * INTO room_record
  FROM public.game_rooms 
  WHERE id = response_record.room_id;
  
  IF room_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Prevent self-evaluation
  IF response_record.player_id = player_id_param THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_evaluate_own_response');
  END IF;
  
  -- Update the response with evaluation
  UPDATE public.game_responses 
  SET 
    evaluation = evaluation_data->>'evaluation',
    evaluation_by = player_id_param,
    honesty = (evaluation_data->>'honesty')::integer,
    attraction = (evaluation_data->>'attraction')::integer,
    intimacy = (evaluation_data->>'intimacy')::integer,
    surprise = (evaluation_data->>'surprise')::integer
  WHERE id = response_id_param;
  
  -- Get player numbers
  SELECT player_number INTO evaluating_player_number
  FROM public.room_participants 
  WHERE room_id = response_record.room_id AND player_id = player_id_param;
  
  SELECT player_number INTO responding_player_number
  FROM public.room_participants 
  WHERE room_id = response_record.room_id AND player_id = response_record.player_id;
  
  -- Get other player for next turn
  SELECT player_id INTO other_player_id
  FROM public.room_participants 
  WHERE room_id = response_record.room_id AND player_id != player_id_param;
  
  current_sub_turn := room_record.question_sub_turn;
  
  -- Determine next phase logic
  IF current_sub_turn = 'first_evaluation' THEN
    -- After first evaluation, second player responds
    next_player := CASE WHEN room_record.current_turn = 'player1' THEN 'player2' ELSE 'player1' END;
    next_sub_turn := 'second_response';
    
    UPDATE public.game_rooms 
    SET 
      current_phase = 'response-input',
      current_turn = next_player,
      question_sub_turn = next_sub_turn
    WHERE id = response_record.room_id;
    
  ELSIF current_sub_turn = 'second_evaluation' THEN
    -- After second evaluation, question is complete
    SELECT COUNT(*) INTO evaluation_count
    FROM public.game_responses 
    WHERE room_id = response_record.room_id 
    AND evaluation IS NOT NULL;
    
    SELECT COUNT(*) INTO total_responses
    FROM public.game_responses 
    WHERE room_id = response_record.room_id 
    AND response IS NOT NULL;
    
    -- Check if game should finish (e.g., after 6 evaluations = 3 complete rounds)
    IF evaluation_count >= 6 THEN
      game_finished := true;
      
      UPDATE public.game_rooms 
      SET 
        current_phase = 'finished',
        finished_at = now(),
        question_completion_status = 'complete'
      WHERE id = response_record.room_id;
    ELSE
      -- Advance to next card
      next_player := CASE WHEN room_record.question_first_responder = 'player1' THEN 'player2' ELSE 'player1' END;
      
      UPDATE public.game_rooms 
      SET 
        current_phase = 'card-display',
        current_turn = next_player,
        question_sub_turn = 'first_response',
        question_first_responder = next_player,
        question_completion_status = 'complete',
        current_card = null,
        current_card_index = current_card_index + 1
      WHERE id = response_record.room_id;
    END IF;
  END IF;
  
  -- Create sync event for evaluation completion
  INSERT INTO public.game_sync (
    room_id, 
    action_type, 
    action_data, 
    triggered_by
  ) VALUES (
    response_record.room_id,
    'evaluation_complete',
    jsonb_build_object(
      'evaluation', evaluation_data->>'evaluation',
      'question', response_record.card_id,
      'response', response_record.response,
      'round_number', response_record.round_number,
      'evaluation_by', player_id_param,
      'responding_player_id', response_record.player_id,
      'evaluating_player_number', evaluating_player_number,
      'responding_player_number', responding_player_number,
      'next_player_number', CASE WHEN next_player = 'player1' THEN 1 ELSE 2 END,
      'total_evaluations', evaluation_count,
      'game_finished', game_finished,
      'sub_turn_completed', current_sub_turn,
      'next_sub_turn', next_sub_turn,
      'timestamp', now()::text
    ),
    player_id_param
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'evaluation_id', response_id_param,
    'next_phase', CASE 
      WHEN game_finished THEN 'finished'
      WHEN current_sub_turn = 'first_evaluation' THEN 'response-input'
      ELSE 'card-display'
    END,
    'next_player', next_player,
    'game_finished', game_finished
  );
END;
$function$;