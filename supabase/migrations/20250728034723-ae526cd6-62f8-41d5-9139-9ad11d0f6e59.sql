-- Fix the auto_create_response_sync_event function to include proper player numbers
CREATE OR REPLACE FUNCTION public.auto_create_response_sync_event()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL THEN
    DECLARE
      evaluating_player text;
      responding_player text;
      responding_player_number integer;
      evaluating_player_number integer;
      question_text text;
    BEGIN
      -- Get the responding player's number from room_participants
      SELECT player_number INTO responding_player_number
      FROM room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.player_id
      LIMIT 1;
      
      -- If we can't find the player number, log error and exit
      IF responding_player_number IS NULL THEN
        RAISE LOG 'Cannot find player_number for player_id % in room %', NEW.player_id, NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Determine player roles and evaluating player number
      IF responding_player_number = 1 THEN
        responding_player := 'player1';
        evaluating_player := 'player2';
        evaluating_player_number := 2;
      ELSE
        responding_player := 'player2';
        evaluating_player := 'player1';
        evaluating_player_number := 1;
      END IF;
      
      -- Get question text
      SELECT text INTO question_text FROM questions WHERE id::text = NEW.card_id;
      
      -- Update game room to evaluation phase with correct turn
      UPDATE public.game_rooms 
      SET 
        current_phase = 'evaluation',
        current_turn = evaluating_player
      WHERE id = NEW.room_id;
      
      -- Insert the response_submit sync event with complete data
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'response_submit',
        jsonb_build_object(
          'question', COALESCE(question_text, 'Unknown question'),
          'response', NEW.response,
          'response_time', NEW.response_time,
          'evaluating_player', evaluating_player,
          'responding_player', responding_player,
          'evaluating_player_number', evaluating_player_number,
          'responding_player_number', responding_player_number,
          'round_number', NEW.round_number,
          'timestamp', NEW.created_at::text,
          'auto_generated', true,
          'player_name', NEW.player_id
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Auto-created response_submit sync event for room % - responding player % (number %) -> evaluating player % (number %), updated phase to evaluation', 
        NEW.room_id, NEW.player_id, responding_player_number, evaluating_player, evaluating_player_number;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create function to handle evaluation completion and advance to next round
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND OLD.evaluation IS NULL THEN
    DECLARE
      current_round integer;
      next_turn text;
      evaluating_player_number integer;
      next_player_number integer;
    BEGIN
      -- Get current round number
      current_round := NEW.round_number;
      
      -- Get the evaluating player's number
      SELECT player_number INTO evaluating_player_number
      FROM room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
      LIMIT 1;
      
      -- Determine next player
      IF evaluating_player_number = 1 THEN
        next_turn := 'player2';
        next_player_number := 2;
      ELSE
        next_turn := 'player1';
        next_player_number := 1;
      END IF;
      
      -- Update game room to next round
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
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
      
      RAISE LOG 'Evaluation completed for room % round %, advancing to next round with turn: %', 
        NEW.room_id, current_round, next_turn;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for evaluation completion
DROP TRIGGER IF EXISTS trigger_handle_evaluation_completion ON public.game_responses;
CREATE TRIGGER trigger_handle_evaluation_completion
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_completion();

-- Function to fix stuck evaluation rooms
CREATE OR REPLACE FUNCTION public.fix_stuck_evaluation_rooms()
 RETURNS TABLE(room_id uuid, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    FROM game_rooms gr
    JOIN game_responses gres ON gr.id = gres.room_id 
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