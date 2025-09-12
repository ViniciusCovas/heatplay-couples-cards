-- Add new fields to game_rooms table for enhanced turn management
ALTER TABLE public.game_rooms 
ADD COLUMN question_sub_turn text DEFAULT 'first_response',
ADD COLUMN question_first_responder text DEFAULT NULL,
ADD COLUMN question_completion_status text DEFAULT 'incomplete';

-- Add check constraints for the new fields
ALTER TABLE public.game_rooms 
ADD CONSTRAINT question_sub_turn_check 
CHECK (question_sub_turn IN ('first_response', 'first_evaluation', 'second_response', 'second_evaluation'));

ALTER TABLE public.game_rooms 
ADD CONSTRAINT question_completion_status_check 
CHECK (question_completion_status IN ('incomplete', 'first_complete', 'both_complete'));

-- Update the evaluation completion trigger to handle sub-turns
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_v4()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  evaluating_player_number INTEGER;
  next_turn TEXT;
  next_player_number INTEGER;
  total_evaluations INTEGER;
  next_card_id TEXT;
  room_used_cards TEXT[];
  current_card_id TEXT;
  update_count INTEGER;
  room_record RECORD;
  current_sub_turn TEXT;
  first_responder TEXT;
  completion_status TEXT;
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    
    RAISE LOG 'EVALUATION TRIGGER V4 FIRED: room_id=%, response_id=%, evaluation_by=%', 
      NEW.room_id, NEW.id, NEW.evaluation_by;
    
    -- Get evaluating player number
    SELECT player_number INTO evaluating_player_number
    FROM public.room_participants 
    WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
    LIMIT 1;
    
    IF evaluating_player_number IS NULL THEN
      RAISE LOG 'ERROR: Cannot find evaluating player % in room %', NEW.evaluation_by, NEW.room_id;
      RETURN NEW;
    END IF;
    
    -- Get room details with row lock
    SELECT * INTO room_record
    FROM public.game_rooms 
    WHERE id = NEW.room_id
    FOR UPDATE;
    
    IF room_record IS NULL THEN
      RAISE LOG 'ERROR: Room % not found', NEW.room_id;
      RETURN NEW;
    END IF;
    
    -- Get current sub-turn state
    current_sub_turn := COALESCE(room_record.question_sub_turn, 'first_response');
    first_responder := room_record.question_first_responder;
    completion_status := COALESCE(room_record.question_completion_status, 'incomplete');
    
    -- Count total evaluations for this room
    SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
    INTO total_evaluations
    FROM public.game_responses 
    WHERE room_id = NEW.room_id;
    
    RAISE LOG 'Processing evaluation: total_evaluations=%, current_sub_turn=%, first_responder=%', 
      total_evaluations, current_sub_turn, first_responder;
    
    -- Check if game should end (after 12+ evaluations = 6 questions × 2 evaluations each)
    IF total_evaluations >= 12 THEN
      -- Game finished
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
          'final_round', NEW.round_number,
          'total_evaluations', total_evaluations,
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
      
      RAISE LOG 'Game completed after % evaluations for room %', total_evaluations, NEW.room_id;
      
    ELSE
      -- Continue game - handle sub-turn progression
      
      -- Determine next state based on current sub-turn
      IF current_sub_turn = 'first_evaluation' THEN
        -- After first evaluation, same question but second player responds
        IF evaluating_player_number = 1 THEN
          next_turn := 'player2';
          next_player_number := 2;
        ELSE
          next_turn := 'player1';
          next_player_number := 1;
        END IF;
        
        -- Update room state for second response to same question
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          question_sub_turn = 'second_response',
          question_completion_status = 'first_complete'
        WHERE id = NEW.room_id;
        
        -- Create sync event for second response phase
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
            'round_number', NEW.round_number,
            'next_turn', next_turn,
            'next_player_number', next_player_number,
            'sub_turn', 'second_response',
            'same_question', true,
            'current_card_id', room_record.current_card,
            'total_evaluations', total_evaluations,
            'game_finished', false,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Sub-turn advanced: room %, second response phase, next turn %, same card %', 
          NEW.room_id, next_turn, room_record.current_card;
        
      ELSIF current_sub_turn = 'second_evaluation' THEN
        -- After second evaluation, advance to next question
        
        -- Determine who goes first on next question (alternate from current first responder)
        IF first_responder = 'player1' THEN
          next_turn := 'player2';
          next_player_number := 2;
        ELSE
          next_turn := 'player1';
          next_player_number := 1;
        END IF;
        
        -- Add current card to used_cards if not already there
        current_card_id := room_record.current_card;
        room_used_cards := COALESCE(room_record.used_cards, '{}');
        
        IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(room_used_cards)) THEN
          room_used_cards := array_append(room_used_cards, current_card_id);
        END IF;
        
        -- Select next card using existing robust function
        next_card_id := public.select_next_card_robust(NEW.room_id, room_used_cards);
        
        -- Update room state for next question
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          current_card = next_card_id,
          current_card_index = COALESCE(current_card_index, 0) + 1,
          used_cards = room_used_cards,
          question_sub_turn = 'first_response',
          question_first_responder = next_turn,
          question_completion_status = 'incomplete'
        WHERE id = NEW.room_id;
        
        -- Create sync event for next question
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
            'round_number', NEW.round_number,
            'next_turn', next_turn,
            'next_player_number', next_player_number,
            'next_card_id', next_card_id,
            'sub_turn', 'first_response',
            'new_question', true,
            'total_evaluations', total_evaluations,
            'game_finished', false,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Question completed: room %, advancing to next card %, next turn %', 
          NEW.room_id, next_card_id, next_turn;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop the old trigger and create the new one
DROP TRIGGER IF EXISTS handle_evaluation_completion_v3_trigger ON public.game_responses;
CREATE TRIGGER handle_evaluation_completion_v4_trigger
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_completion_v4();

-- Update the auto response sync trigger to handle sub-turns
CREATE OR REPLACE FUNCTION public.auto_create_response_sync_event_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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
      current_sub_turn text;
    BEGIN
      -- Get the responding player's number from room_participants
      SELECT player_number INTO responding_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.player_id
      LIMIT 1;
      
      -- If we can't find the player number, log error and exit
      IF responding_player_number IS NULL THEN
        RAISE LOG 'Cannot find player_number for player_id % in room %', NEW.player_id, NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Get current sub-turn from room
      SELECT question_sub_turn INTO current_sub_turn
      FROM public.game_rooms 
      WHERE id = NEW.room_id;
      
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
      SELECT text INTO question_text FROM public.questions WHERE id::text = NEW.card_id;
      
      -- Update room sub-turn state
      IF current_sub_turn = 'first_response' THEN
        UPDATE public.game_rooms 
        SET 
          current_phase = 'evaluation',
          current_turn = evaluating_player,
          question_sub_turn = 'first_evaluation'
        WHERE id = NEW.room_id;
      ELSIF current_sub_turn = 'second_response' THEN
        UPDATE public.game_rooms 
        SET 
          current_phase = 'evaluation',
          current_turn = evaluating_player,
          question_sub_turn = 'second_evaluation'
        WHERE id = NEW.room_id;
      END IF;
      
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
          'sub_turn', current_sub_turn,
          'timestamp', NEW.created_at::text,
          'auto_generated', true,
          'player_name', NEW.player_id
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Auto-created response_submit sync event V2 for room % - sub_turn %, responding player % -> evaluating player %', 
        NEW.room_id, current_sub_turn, NEW.player_id, evaluating_player;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the trigger
DROP TRIGGER IF EXISTS auto_create_response_sync_event_trigger ON public.game_responses;
CREATE TRIGGER auto_create_response_sync_event_v2_trigger
  AFTER INSERT OR UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_response_sync_event_v2();