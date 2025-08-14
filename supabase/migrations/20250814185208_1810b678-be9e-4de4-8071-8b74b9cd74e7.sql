-- Fix handle_evaluation_completion to properly manage turn transitions
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND OLD.evaluation IS NULL THEN
    DECLARE
      current_round integer;
      next_turn text;
      evaluating_player_number integer;
      next_player_number integer;
      total_responses integer;
      total_evaluations integer;
    BEGIN
      -- Get current round number
      current_round := NEW.round_number;
      
      -- Get the evaluating player's number
      SELECT player_number INTO evaluating_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
      LIMIT 1;
      
      -- Count total responses and evaluations for this room
      SELECT 
        COUNT(*) FILTER (WHERE response IS NOT NULL) as resp_count,
        COUNT(*) FILTER (WHERE evaluation IS NOT NULL) as eval_count
      INTO total_responses, total_evaluations
      FROM public.game_responses 
      WHERE room_id = NEW.room_id;
      
      -- Determine next player (alternate between players)
      IF evaluating_player_number = 1 THEN
        next_turn := 'player2';
        next_player_number := 2;
      ELSE
        next_turn := 'player1';
        next_player_number := 1;
      END IF;
      
      -- Check if game should end (after 6+ rounds with evaluations)
      IF total_evaluations >= 6 THEN
        UPDATE public.game_rooms 
        SET 
          status = 'finished',
          current_phase = 'final-report',
          finished_at = NOW()
        WHERE id = NEW.room_id;
        
        -- Create sync event for game completion
        INSERT INTO public.game_sync (
          room_id, 
          action_type, 
          action_data, 
          triggered_by
        ) VALUES (
          NEW.room_id,
          'game_finish',
          jsonb_build_object(
            'final_round', current_round,
            'total_responses', total_responses,
            'total_evaluations', total_evaluations,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Game completed after % evaluations for room %', total_evaluations, NEW.room_id;
      ELSE
        -- Continue to next round
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          current_card = null,
          current_card_index = current_card_index + 1
        WHERE id = NEW.room_id;
        
        -- Create sync event for evaluation completion
        INSERT INTO public.game_sync (
          room_id, 
          action_type, 
          action_data, 
          triggered_by
        ) VALUES (
          NEW.room_id,
          'evaluation_complete',
          jsonb_build_object(
            'evaluation', NEW.evaluation,
            'round_number', current_round,
            'next_turn', next_turn,
            'next_player_number', next_player_number,
            'total_responses', total_responses,
            'total_evaluations', total_evaluations,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Evaluation completed for room % round %, advancing to next round with turn: %', 
          NEW.room_id, current_round, next_turn;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix the join_room_by_code function to handle better error states
CREATE OR REPLACE FUNCTION public.join_room_by_code(room_code_param text, player_id_param text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id uuid;
  v_status text;
  v_existing record;
  v_assigned integer;
BEGIN
  -- Validate inputs
  IF room_code_param IS NULL OR trim(room_code_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  
  IF player_id_param IS NULL OR trim(player_id_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_player_id');
  END IF;

  -- Normalize incoming code
  room_code_param := upper(trim(room_code_param));

  -- 1) Find open room by code (waiting or playing)
  SELECT id, status INTO v_room_id, v_status
  FROM public.game_rooms
  WHERE room_code = room_code_param
    AND status IN ('waiting','playing')
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;

  -- 2) Ensure room is still open via helper
  IF NOT public.room_is_open(v_room_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_closed');
  END IF;

  -- 3) Already a participant?
  SELECT * INTO v_existing
  FROM public.room_participants
  WHERE room_id = v_room_id
    AND player_id = player_id_param
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', v_room_id,
      'player_number', v_existing.player_number,
      'already_joined', true
    );
  END IF;

  -- 4) Assign player number atomically
  SELECT public.assign_player_number(v_room_id, player_id_param)
  INTO v_assigned;

  IF v_assigned IS NULL OR v_assigned = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_full');
  END IF;

  -- 5) Insert participation
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_room_id, player_id_param, true, v_assigned);

  RETURN jsonb_build_object(
    'success', true,
    'room_id', v_room_id,
    'player_number', v_assigned,
    'already_joined', false
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return a safe error payload with more detail for debugging
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'join_failed',
      'details', SQLERRM
    );
END;
$function$;